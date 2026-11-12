'use strict';

const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/customerRepo');
const { createCustomers, normalizeQuery, VIEW_RIGHTS } = require('../src/services/customers');
const { createPermissions } = require('../src/services/permissions');
const { requireRight } = require('../src/middleware/permissions');
const { guardPages } = require('../src/middleware/pageGuard');
const { buildMenu } = require('../src/services/menu');
const { createSessionToken } = require('../src/services/session');

const user = (id, role) => ({ user_id: id, first_name: 'F', last_name: 'L', email: `u${id}@x.test`, role, is_blocked: false, status: 'active' });
const perms = (rights) => createPermissions({ db: {}, repo: { listUserRights: async () => rights } });

// ---- query cleaning ----
test('normalizeQuery: defaults, trimming and safe fallbacks', () => {
  assert.deepStrictEqual(normalizeQuery({}), { search: '', payterm: null, sort: 'name', dir: 'asc', pageSize: 25, page: 1 });
  const n = normalizeQuery({ search: '  Globus  ', payterm: '30d', sort: 'term', dir: 'desc', pageSize: '50', page: '3' });
  assert.deepStrictEqual(n, { search: 'Globus', payterm: '30D', sort: 'term', dir: 'desc', pageSize: 50, page: 3 });
});

test('normalizeQuery: hostile or invalid values fall back instead of reaching the database', () => {
  const n = normalizeQuery({ search: 'x'.repeat(500), payterm: "COD'; DROP TABLE customer;--", sort: 'custname; DROP', dir: 'sideways', pageSize: '100000', page: '-4' });
  assert.strictEqual(n.search.length, 100);
  assert.strictEqual(n.payterm, null);
  assert.strictEqual(n.sort, 'name');
  assert.strictEqual(n.dir, 'asc');
  assert.strictEqual(n.pageSize, 25);
  assert.strictEqual(n.page, 1);
  assert.strictEqual(normalizeQuery({ page: 'abc' }).page, 1);
});

// ---- SQL ----
function recorder(rows = []) {
  const calls = [];
  return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows }; } };
}

test('SQL: reads the active view, parameterizes everything, and escapes LIKE wildcards', async () => {
  const db = recorder();
  await repo.listCustomers(db, { search: '50%_off\\', payterm: 'COD', sort: 'name', dir: 'asc', limit: 25, offset: 0 });
  const { sql, params } = db.calls[0];
  assert.match(sql, /FROM customer_active/);
  assert.doesNotMatch(sql, /FROM customer\b(?!_)/);
  assert.strictEqual(params[0], '%50\\%\\_off\\\\%');
  assert.deepStrictEqual(params.slice(1), ['COD', 25, 0]);
});

test('SQL: sort column comes from a fixed list, never from the request', async () => {
  const db = recorder();
  await repo.listCustomers(db, { sort: 'custname; DROP TABLE customer', dir: 'desc; --', limit: 10, offset: 0 });
  assert.match(db.calls[0].sql, /ORDER BY lower\(custname\) ASC, custno ASC/);
  await repo.listCustomers(db, { sort: 'term', dir: 'desc', limit: 10, offset: 0 });
  assert.match(db.calls[1].sql, /ORDER BY payterm DESC, custno ASC/);
  assert.strictEqual(db.calls[1].params[0], null); // no search -> no filter
});

// ---- service ----
test('list: maps rows, computes totals and pages, and reports the viewer\'s rights', async () => {
  const rows = [
    { custno: 'C0001', custname: 'Globus', address: 'A', payterm: '30D', total: '53' },
    { custno: 'C0002', custname: 'RF', address: null, payterm: 'COD', total: '53' },
  ];
  const svc = createCustomers({ db: {}, repo: { listCustomers: async (_db, a) => { svc.last = a; return rows; } }, perms: perms(['CUST_EDIT']) });
  const r = await svc.list(user(5, 'user'), { pageSize: '10', page: '2' });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body.customers[0], { code: 'C0001', name: 'Globus', address: 'A', payterm: '30D' });
  assert.strictEqual(r.body.total, 53);
  assert.strictEqual(r.body.pages, 6);
  assert.deepStrictEqual(r.body.can, { add: false, edit: true, delete: false });
  assert.strictEqual(svc.last.limit, 10);
  assert.strictEqual(svc.last.offset, 10);
  assert.ok(!JSON.stringify(r.body).includes('total":"'));
});

test('list: an empty result is page 1 of 1 with total 0; admins can do everything', async () => {
  const svc = createCustomers({ db: {}, repo: { listCustomers: async () => [] }, perms: perms([]) });
  const r = await svc.list(user(1, 'admin'), {});
  assert.deepStrictEqual([r.body.total, r.body.pages, r.body.customers.length], [0, 1, 0]);
  assert.deepStrictEqual(r.body.can, { add: true, edit: true, delete: true });
});

// ---- permission checks ----
function run(mw, req) {
  return new Promise((resolve) => {
    const res = { status(code) { this.code = code; return this; }, json(body) { resolve({ code: this.code, body }); } };
    mw(req, res, (err) => resolve({ next: true, err }));
  });
}

test('API gate: signed out -> 401; no customer right -> 403; any one customer right or admin -> allowed', async () => {
  const gate = (rights) => requireRight(perms(rights), ...VIEW_RIGHTS);
  assert.strictEqual((await run(gate([]), {})).code, 401);
  assert.strictEqual((await run(gate(['PROD_ADD']), { user: user(5, 'user') })).code, 403);
  for (const r of VIEW_RIGHTS) assert.strictEqual((await run(gate([r]), { user: user(5, 'user') })).next, true);
  assert.strictEqual((await run(gate([]), { user: user(2, 'admin') })).next, true);
  assert.strictEqual((await run(gate([]), { user: user(1, 'superadmin') })).next, true);
});

const SECRET = 's3cret';
function guardEnv(role, rights) {
  const u = user(9, role);
  const db = { query: async (sql) => ({ rows: sql.includes('user_id = $1') ? [u] : [] }) };
  return guardPages(db, { sessionSecret: SECRET }, undefined, perms(rights));
}
function page(mw, path, cookie) {
  return new Promise((resolve) => {
    const req = { path, headers: cookie ? { cookie: `hope_sid=${cookie}` } : {} };
    const res = { redirect(code, to) { resolve({ redirect: to, code }); }, status(code) { return { send: () => resolve({ code }) }; }, set() {} };
    mw(req, res, (err) => resolve({ next: true, err }));
  });
}
const cookie = createSessionToken(9, SECRET);

test('page: signed out -> login; user without a customer right -> home; with one right, admin -> opens', async () => {
  assert.strictEqual((await page(guardEnv('user', []), '/customers.html')).redirect, '/login.html');
  assert.strictEqual((await page(guardEnv('user', ['HR_ADD']), '/customers.html', cookie)).redirect, '/home.html');
  assert.strictEqual((await page(guardEnv('user', ['CUST_ADD']), '/customers.html', cookie)).next, true);
  assert.strictEqual((await page(guardEnv('admin', []), '/customers.html', cookie)).next, true);
  assert.strictEqual((await page(guardEnv('user', ['CUST_EDIT']), '/CUSTOMERS.html', cookie)).next, true);
  assert.strictEqual((await page(guardEnv('user', ['HR_ADD']), '/%63ustomers.html', cookie)).redirect, '/home.html');
});

test('page: a rights rule fails closed when no permission checker is available', async () => {
  const u = user(9, 'admin');
  const db = { query: async (sql) => ({ rows: sql.includes('user_id = $1') ? [u] : [] }) };
  const mw = guardPages(db, { sessionSecret: SECRET }); // no perms passed
  assert.strictEqual((await page(mw, '/customers.html', cookie)).redirect, '/home.html');
});

test('menu: the Customer tile now links to the customer page, for people who may see it', () => {
  const modules = [{ module_code: 'CUSTOMER', module_name: 'Customer Management' }, { module_code: 'PRODUCT', module_name: 'Product Management' }];
  const m = buildMenu(user(5, 'user'), modules, ['CUSTOMER']);
  assert.deepStrictEqual(m.modules.map((x) => [x.code, x.href]), [['CUSTOMER', '/customers.html']]);
  assert.strictEqual(buildMenu(user(2, 'admin'), modules, []).modules[1].href, null); // Product page comes later
});
