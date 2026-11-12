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
  assert.deepStrictEqual(normalizeQuery({}), { search: '', payterm: null, status: 'active', sort: 'name', dir: 'asc', pageSize: 25, page: 1 });
  const n = normalizeQuery({ search: '  Globus  ', payterm: '30d', sort: 'term', dir: 'desc', pageSize: '50', page: '3' });
  assert.deepStrictEqual(n, { search: 'Globus', payterm: '30D', status: 'active', sort: 'term', dir: 'desc', pageSize: 50, page: 3 });
});

test('normalizeQuery: hostile or invalid values fall back instead of reaching the database', () => {
  const n = normalizeQuery({ search: 'x'.repeat(500), payterm: "COD'; DROP TABLE customer;--", status: 'everything', sort: 'custname; DROP', dir: 'sideways', pageSize: '100000', page: '-4' });
  assert.strictEqual(n.search.length, 100);
  assert.strictEqual(n.payterm, null);
  assert.strictEqual(n.status, 'active');
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
  assert.deepStrictEqual(r.body.can, { add: false, edit: true, delete: false, restore: false, seeDeleted: false });
  assert.strictEqual(svc.last.limit, 10);
  assert.strictEqual(svc.last.offset, 10);
  assert.ok(!JSON.stringify(r.body).includes('total":"'));
});

test('list: an empty result is page 1 of 1 with total 0; admins can do everything', async () => {
  const svc = createCustomers({ db: {}, repo: { listCustomers: async () => [], countCustomers: async () => ({ active: 0, deleted: 0, all: 0 }) }, perms: perms([]) });
  const r = await svc.list(user(1, 'admin'), {});
  assert.deepStrictEqual([r.body.total, r.body.pages, r.body.customers.length], [0, 1, 0]);
  assert.deepStrictEqual(r.body.can, { add: true, edit: true, delete: true, restore: true, seeDeleted: true });
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
  assert.strictEqual(buildMenu(user(2, 'admin'), [{ module_code: 'HR', module_name: 'Human Resources' }], []).modules[0].href, null); // HR page comes later
});

// ================= S2-DEV-02: add and edit =================
const { validateCustomer } = require('../src/validators/customer');

test('validator: trims, upper-cases the term, turns a blank address into null, ignores any code', () => {
  const { errors, value } = validateCustomer({ code: 'C9999', name: '  Globus  ', address: '   ', payterm: '30d' });
  assert.deepStrictEqual(errors, {});
  assert.deepStrictEqual(value, { name: 'Globus', address: null, payterm: '30D' });
});

test('validator: required fields and the database column limits (name 20, address 50)', () => {
  const none = validateCustomer({}).errors;
  assert.ok(none.name && none.payterm && !none.address);
  assert.match(validateCustomer({ name: 'x'.repeat(21), payterm: 'COD' }).errors.name, /20/);
  assert.deepStrictEqual(validateCustomer({ name: 'x'.repeat(20), payterm: 'COD' }).errors, {});
  assert.match(validateCustomer({ name: 'A', address: 'y'.repeat(51), payterm: 'COD' }).errors.address, /50/);
  assert.ok(validateCustomer({ name: 'A', payterm: 'NET60' }).errors.payterm);
  assert.ok(validateCustomer({ name: '   ', payterm: 'COD' }).errors.name);
});

test('SQL: the next code looks at every row (deleted too), under a lock, inside the transaction', async () => {
  const calls = [];
  const client = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (/MAX\(substr/.test(sql)) return { rows: [{ n: '26' }] };
      return { rows: [{ custno: params ? params[0] : null }] };
    },
  };
  const row = await repo.insertCustomer(client, { name: 'A', address: null, payterm: 'COD' });
  assert.match(calls[0].sql, /pg_advisory_xact_lock/);
  assert.match(calls[1].sql, /FROM customer WHERE/);          // the table, not the active view
  assert.doesNotMatch(calls[1].sql, /customer_active/);
  assert.strictEqual(calls[2].params[0], 'C0026');
  assert.strictEqual(row.custno, 'C0026');
});

test('SQL: codes run out cleanly after C9999; edits skip deleted rows and never touch the code', async () => {
  const full = { query: async (sql) => ({ rows: /MAX\(substr/.test(sql) ? [{ n: '10000' }] : [] }) };
  await assert.rejects(repo.insertCustomer(full, { name: 'A', address: null, payterm: 'COD' }), (e) => e.code === 'CODE_EXHAUSTED');
  const db = recorder();
  await repo.updateCustomer(db, 'C0001', { name: 'N', address: null, payterm: '45D' });
  assert.match(db.calls[0].sql, /UPDATE customer SET custname = \$2, address = \$3, payterm = \$4\s+WHERE custno = \$1 AND NOT is_deleted/);
  assert.doesNotMatch(db.calls[0].sql, /SET custno/);
});

function writer(existing) {
  const log = { users: [], inserted: null, updated: null };
  const db = { txAs: async (name, fn) => { log.users.push(name); return fn({}); } };
  const r = {
    findCustomer: async (_d, code) => (existing && existing.custno === code ? existing : null),
    insertCustomer: async (_c, v) => { log.inserted = v; return { custno: 'C0026', custname: v.name, address: v.address, payterm: v.payterm }; },
    updateCustomer: async (_c, code, v) => { log.updated = { code, ...v }; return existing && existing.custno === code ? { custno: code, custname: v.name, address: v.address, payterm: v.payterm } : null; },
  };
  return { svc: createCustomers({ db, repo: r, perms: perms([]) }), log };
}
const ANA = { ...user(5, 'user'), email: 'ana@example.com' };

test('create: saves under the actor\'s name, returns the new code; invalid input never reaches the database', async () => {
  const { svc, log } = writer(null);
  const bad = await svc.create(ANA, { name: '', payterm: '' });
  assert.strictEqual(bad.status, 400);
  assert.strictEqual(log.users.length, 0);
  const r = await svc.create(ANA, { code: 'C0001', name: ' Peri ', address: '2880 Zanker', payterm: 'cod' });
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(r.body.customer, { code: 'C0026', name: 'Peri', address: '2880 Zanker', payterm: 'COD' });
  assert.deepStrictEqual(log.users, ['ana@example.com']);
  assert.deepStrictEqual(log.inserted, { name: 'Peri', address: '2880 Zanker', payterm: 'COD' });
});

test('create: no codes left -> 409; other database errors propagate', async () => {
  const mk = (err) => createCustomers({ db: { txAs: async () => { throw err; } }, repo: {}, perms: perms([]) });
  const full = Object.assign(new Error('x'), { code: 'CODE_EXHAUSTED' });
  assert.strictEqual((await mk(full).create(ANA, { name: 'A', payterm: 'COD' })).status, 409);
  await assert.rejects(mk(new Error('connection lost')).create(ANA, { name: 'A', payterm: 'COD' }), /connection lost/);
});

test('update: the code in the URL decides which row; a code in the body is ignored; unknown or malformed -> 404', async () => {
  const { svc, log } = writer({ custno: 'C0001', custname: 'Old', address: null, payterm: 'COD' });
  const r = await svc.update(ANA, 'C0001', { code: 'C0002', name: 'New', address: '', payterm: '45D' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(log.updated.code, 'C0001');
  assert.deepStrictEqual(r.body.customer, { code: 'C0001', name: 'New', address: null, payterm: '45D' });
  assert.strictEqual((await svc.update(ANA, 'C0099', { name: 'X', payterm: 'COD' })).status, 404);
  assert.strictEqual((await svc.update(ANA, "C0001'; DROP", { name: 'X', payterm: 'COD' })).status, 404);
  assert.strictEqual((await svc.update(ANA, 'C0001', { name: '', payterm: 'COD' })).status, 400);
});

test('get: returns one live customer; malformed or missing codes are 404', async () => {
  const { svc } = writer({ custno: 'C0001', custname: 'Old', address: 'A', payterm: 'COD' });
  assert.strictEqual((await svc.get('C0001')).body.customer.name, 'Old');
  assert.strictEqual((await svc.get('C0002')).status, 404);
  assert.strictEqual((await svc.get('nope')).status, 404);
});

test('rights: Add needs CUST_ADD, Edit needs CUST_EDIT (holding only the other right is not enough)', async () => {
  const add = (rights) => requireRight(perms(rights), 'CUST_ADD');
  const edit = (rights) => requireRight(perms(rights), 'CUST_EDIT');
  assert.strictEqual((await run(add(['CUST_EDIT']), { user: user(5, 'user') })).code, 403);
  assert.strictEqual((await run(add(['CUST_ADD']), { user: user(5, 'user') })).next, true);
  assert.strictEqual((await run(edit(['CUST_ADD']), { user: user(5, 'user') })).code, 403);
  assert.strictEqual((await run(edit(['CUST_EDIT']), { user: user(5, 'user') })).next, true);
  assert.strictEqual((await run(edit([]), { user: user(2, 'admin') })).next, true);
});

// ================= S2-DEV-03: soft delete and restore =================
const FULL = { custno: 'C0001', custname: 'Globus', address: 'A', payterm: '30D', is_deleted: false, stamp: 'ADD system 2026-11-01 9:00 AM', total: '1' };
const GONE = { ...FULL, custno: 'C0002', custname: 'RF', is_deleted: true, stamp: 'DELETE ana@example.com 2026-11-12 2:00 PM' };

function lister(rows) {
  const seen = {};
  const repoFake = { listCustomers: async (_d, a) => { seen.args = a; return rows; }, countCustomers: async () => ({ active: 24, deleted: 1, all: 25 }) };
  return { seen, svc: createCustomers({ db: {}, repo: repoFake, perms: perms([]) }) };
}

test('list: Admins see Status, Stamp, the Inactive rows and tab counts; Users get none of that', async () => {
  const a = lister([FULL, GONE]);
  const r = await a.svc.list(user(1, 'admin'), { status: 'all' });
  assert.strictEqual(a.seen.args.scope, 'all');
  assert.deepStrictEqual(r.body.customers[1], { code: 'C0002', name: 'RF', address: 'A', payterm: '30D', deleted: true, status: 'Inactive', stamp: 'DELETE ana@example.com 2026-11-12 2:00 PM' });
  assert.deepStrictEqual(r.body.counts, { active: 24, deleted: 1, all: 25 });
  assert.strictEqual(r.body.can.restore, true);

  const u = lister([FULL]);
  const mine = await u.svc.list(user(5, 'user'), { status: 'all' }); // a User asking for "all" still gets only active rows
  assert.strictEqual(u.seen.args.scope, 'active');
  assert.strictEqual(mine.body.counts, undefined);
  assert.ok(!('stamp' in mine.body.customers[0]) && !('status' in mine.body.customers[0]) && !('deleted' in mine.body.customers[0]));
  assert.strictEqual(mine.body.can.restore, false);
});

test('SQL: Admin scopes read the table, the active scope reads the view', async () => {
  for (const [scope, from, extra] of [['active', /FROM customer_active/, null], ['deleted', /FROM customer\s+WHERE[\s\S]*AND is_deleted/, 1], ['all', /FROM customer\s+WHERE/, null]]) {
    const db = recorder();
    await repo.listCustomers(db, { scope, limit: 10, offset: 0 });
    assert.match(db.calls[0].sql, from, scope);
    if (scope !== 'active') assert.doesNotMatch(db.calls[0].sql, /customer_active/);
    assert.match(db.calls[0].sql, /stamp/);
  }
  const bad = recorder();
  await repo.listCustomers(bad, { scope: "all; DROP TABLE customer", limit: 10, offset: 0 });
  assert.match(bad.calls[0].sql, /FROM customer_active/); // unknown scope falls back to the safe view
});

test('SQL: delete and restore are UPDATEs of is_deleted only (never DELETE), and only on the right state', async () => {
  const db = recorder([{ custno: 'C0001' }]);
  await repo.softDeleteCustomer(db, 'C0001');
  await repo.restoreCustomer(db, 'C0001');
  assert.match(db.calls[0].sql, /UPDATE customer SET is_deleted = true WHERE custno = \$1 AND NOT is_deleted/);
  assert.match(db.calls[1].sql, /UPDATE customer SET is_deleted = false WHERE custno = \$1 AND is_deleted/);
  for (const c of db.calls) assert.doesNotMatch(c.sql, /DELETE FROM/i);
  const counts = recorder([{ active: '24', deleted: '1', total: '25' }]);
  assert.deepStrictEqual(await repo.countCustomers(counts), { active: 24, deleted: 1, all: 25 });
  const sales = recorder([{ n: '3' }]);
  assert.strictEqual(await repo.countActiveSales(sales, 'C0001'), 3);
  assert.match(sales.calls[0].sql, /sales_active/);
});

function deleter({ sales = 0, found = true, trigger = false } = {}) {
  const log = { users: [], deleted: [], restored: [] };
  const db = { txAs: async (name, fn) => { log.users.push(name); return fn({}); } };
  const r = {
    findCustomer: async () => (found ? { custno: 'C0001', custname: 'Globus', address: null, payterm: 'COD' } : null),
    countActiveSales: async () => sales,
    softDeleteCustomer: async (_c, code) => { if (trigger) throw new Error('Cannot delete customer row: 2 active related record(s) still exist.'); log.deleted.push(code); return { custno: code, custname: 'Globus', address: null, payterm: 'COD' }; },
    restoreCustomer: async (_c, code) => { log.restored.push(code); return found ? { custno: code, custname: 'Globus', address: null, payterm: 'COD' } : null; },
  };
  return { svc: createCustomers({ db, repo: r, perms: perms([]) }), log };
}

test('delete: soft-deletes under the actor\'s name', async () => {
  const { svc, log } = deleter();
  const r = await svc.remove(ANA, 'C0001');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(log.deleted, ['C0001']);
  assert.deepStrictEqual(log.users, ['ana@example.com']);
});

test('delete: refused with a clear message while the customer has active sales; the row is untouched', async () => {
  const { svc, log } = deleter({ sales: 2 });
  const r = await svc.remove(ANA, 'C0001');
  assert.strictEqual(r.status, 409);
  assert.match(r.body.error, /Globus has 2 active sales/);
  assert.strictEqual(log.deleted.length, 0);
  assert.match((await deleter({ sales: 1 }).svc.remove(ANA, 'C0001')).body.error, /1 active sale,/);
});

test('delete: the database trigger is the last guard (a sale added in the meantime) -> 409, not a crash', async () => {
  const r = await deleter({ trigger: true }).svc.remove(ANA, 'C0001');
  assert.strictEqual(r.status, 409);
  const boom = createCustomers({ db: { txAs: async () => { throw new Error('connection lost'); } }, repo: {}, perms: perms([]) });
  await assert.rejects(boom.remove(ANA, 'C0001'), /connection lost/);
});

test('delete: unknown, already-deleted or malformed code -> 404', async () => {
  assert.strictEqual((await deleter({ found: false }).svc.remove(ANA, 'C0001')).status, 404);
  assert.strictEqual((await deleter().svc.remove(ANA, 'x')).status, 404);
});

test('restore: Admins and Superadmins only (checked in the service as well as the route)', async () => {
  const { svc, log } = deleter();
  assert.strictEqual((await svc.restore(ANA, 'C0001')).status, 403);
  assert.strictEqual(log.restored.length, 0);
  assert.strictEqual((await svc.restore(user(2, 'admin'), 'C0001')).status, 200);
  assert.strictEqual((await svc.restore(user(1, 'superadmin'), 'C0001')).status, 200);
  assert.strictEqual((await deleter({ found: false }).svc.restore(user(2, 'admin'), 'C0001')).status, 404);
  assert.strictEqual((await svc.restore(user(2, 'admin'), 'bad')).status, 404);
});

test('rights: Delete needs CUST_DELETE (Add or Edit alone is not enough)', async () => {
  const del = (rights) => requireRight(perms(rights), 'CUST_DELETE');
  assert.strictEqual((await run(del(['CUST_ADD', 'CUST_EDIT']), { user: user(5, 'user') })).code, 403);
  assert.strictEqual((await run(del(['CUST_DELETE']), { user: user(5, 'user') })).next, true);
  assert.strictEqual((await run(del([]), { user: user(2, 'admin') })).next, true);
});
