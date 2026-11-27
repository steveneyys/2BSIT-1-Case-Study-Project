'use strict';

// S4-DEV-01: Sales list with search, and the New Sale / Edit Sale header.
const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/saleRepo');
const { createSales, normalizeQuery, VIEW_RIGHTS, LIST_RIGHTS } = require('../src/services/sales');
const { validateSale } = require('../src/validators/sale');
const { createPermissions } = require('../src/services/permissions');
const { requireRight } = require('../src/middleware/permissions');
const { guardPages } = require('../src/middleware/pageGuard');
const { buildMenu } = require('../src/services/menu');
const { createSessionToken } = require('../src/services/session');

const user = (id, role) => ({ user_id: id, first_name: 'F', last_name: 'L', email: `u${id}@x.test`, role, is_blocked: false, status: 'active' });
const admin = () => user(1, 'admin');
const perms = (rights) => createPermissions({ db: {}, repo: { listUserRights: async () => rights } });
const recorder = (rows = [], rowCount = 1) => { const calls = []; return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows, rowCount }; } }; };
const TODAY = '2026-11-26';
const good = { salesdate: '2026-11-01', custno: 'c0001', empno: '00005' };

// ---- validation ----
test('validateSale: required fields, customer upper-cased, real date, not in the future', () => {
  assert.deepStrictEqual(Object.keys(validateSale({}, { today: TODAY }).errors).sort(), ['custno', 'empno', 'salesdate']);
  const ok = validateSale(good, { today: TODAY });
  assert.deepStrictEqual([ok.errors, ok.value], [{}, { salesdate: '2026-11-01', custno: 'C0001', empno: '00005' }]);
  assert.match(validateSale({ ...good, salesdate: '2026-11-27' }, { today: TODAY }).errors.salesdate, /future/);
  assert.deepStrictEqual(validateSale({ ...good, salesdate: TODAY }, { today: TODAY }).errors, {}); // today is fine
  assert.match(validateSale({ ...good, salesdate: '2026-02-30' }, { today: TODAY }).errors.salesdate, /real date/);
  assert.ok(validateSale({ ...good, custno: 'C 1' }, { today: TODAY }).errors.custno);
  assert.ok(validateSale({ ...good, empno: 'ABCDE' }, { today: TODAY }).errors.empno);
  assert.ok(validateSale({ ...good, empno: '123456' }, { today: TODAY }).errors.empno);
});

test('validateSale: a transaction number in the body is ignored', () => {
  const r = validateSale({ ...good, transno: 'TR999999' }, { today: TODAY });
  assert.strictEqual(r.value.transno, undefined);
});

// ---- query handling ----
test('normalizeQuery: unknown values fall back to safe defaults', () => {
  assert.deepStrictEqual(normalizeQuery({ sort: 'x; DROP TABLE', status: 'zzz', pageSize: '7', page: '-4', dir: 'up', search: '  TR0  ' }),
    { search: 'TR0', status: 'active', sort: 'transno', dir: 'asc', pageSize: 25, page: 1 });
  assert.strictEqual(normalizeQuery({ search: 'x'.repeat(500) }).search.length, 100);
});

// ---- repository SQL ----
test('listSales: searches number, customer and salesperson; escapes wildcards; sort comes from a fixed list; total uses the sale-date price', async () => {
  const db = recorder([]);
  await repo.listSales(db, { search: '50%_', scope: 'active', sort: 'customer; DROP', dir: 'desc', limit: 25, offset: 0 });
  const { sql, params } = db.calls[0];
  assert.deepStrictEqual(params, ['%50\\%\\_%', 25, 0]);
  assert.match(sql, /s\.transno ILIKE \$1/);
  assert.match(sql, /c\.custname ILIKE \$1/);
  assert.match(sql, /e\.lastname ILIKE \$1/);
  assert.match(sql, /price_as_of\(d\.prodcode, p\.sd\)/);
  assert.match(sql, /salesdetail_active/); // deleted lines are not in the total
  assert.match(sql, /NOT s\.is_deleted/);
  assert.ok(!/DROP/.test(sql));
  await repo.listSales(db, { scope: 'all', sort: 'date', dir: 'asc', limit: 10, offset: 10 });
  assert.ok(!/NOT s\.is_deleted/.test(db.calls[1].sql));
  assert.strictEqual(db.calls[1].params[0], null);
  await repo.listSales(db, { scope: 'deleted', limit: 10, offset: 0 });
  assert.match(db.calls[2].sql, /AND s\.is_deleted/);
});

test('nextTransNo: TR + 6 digits, one more than the highest used; gives up at 999999', async () => {
  assert.strictEqual(await repo.nextTransNo(recorder([{ next: '125' }])), 'TR000125');
  assert.strictEqual(await repo.nextTransNo(recorder([{ next: '1' }])), 'TR000001');
  assert.strictEqual(await repo.nextTransNo(recorder([{ next: '1000000' }])), null);
  const db = recorder([{ next: '2' }]);
  await repo.nextTransNo(db);
  assert.match(db.calls[0].sql, /FROM sales\b/); // the table itself: deleted sales keep their number
  assert.ok(!/sales_active/.test(db.calls[0].sql));
});

test('insertSale / updateSale: parameters in order; update only touches live rows', async () => {
  const db = recorder([{ transno: 'TR000125' }]);
  await repo.insertSale(db, 'TR000125', { salesdate: '2026-11-01', custno: 'C0001', empno: '00005' });
  assert.deepStrictEqual(db.calls[0].params, ['TR000125', '2026-11-01', 'C0001', '00005']);
  await repo.updateSale(db, 'TR000125', { salesdate: '2026-11-02', custno: 'C0002', empno: '00006' });
  assert.match(db.calls[2].sql, /NOT is_deleted/);
  assert.deepStrictEqual(db.calls[2].params, ['TR000125', '2026-11-02', 'C0002', '00006']);
  assert.strictEqual(await repo.updateSale(recorder([], 0), 'TR000125', good), null);
});

// ---- service: list ----
const row = (over = {}) => ({
  transno: 'TR000001', salesdate: '2026-10-01', custno: 'C0001', custname: 'Globus Medical ', empno: '00005', lastname: 'Smith ', firstname: 'John',
  is_deleted: false, stamp: 'S', total: '1500.505', lines: '2', unpriced: '0', total_rows: '1', ...over,
});
const listSvc = (rights, rows = [row()]) => createSales({
  db: {}, today: () => TODAY, perms: perms(rights),
  repo: { listSales: async () => rows, countSales: async () => ({ active: 1, deleted: 0, all: 1 }) },
});

test('list: users get live rows with a rounded total and no Status or Stamp; Admins get both and the tab counts', async () => {
  const u = (await listSvc(['SALEDET_VIEW']).list(user(5, 'user'), {})).body;
  assert.deepStrictEqual(u.sales[0], { transno: 'TR000001', salesdate: '2026-10-01', custno: 'C0001', customer: 'Globus Medical', empno: '00005', employee: 'Smith, John', total: 1500.51, lines: 2, unpriced: 0 });
  assert.strictEqual(u.counts, undefined);
  assert.strictEqual(u.can.seeDeleted, false);
  const a = (await listSvc([]).list(admin(), { status: 'all' })).body;
  assert.strictEqual(a.sales[0].status, 'Active');
  assert.strictEqual(a.sales[0].stamp, 'S');
  assert.deepStrictEqual(a.counts, { active: 1, deleted: 0, all: 1 });
  assert.strictEqual(a.can.seeDeleted, true);
});

test('list: a user cannot ask for deleted sales; the status filter is forced to active', async () => {
  let seen;
  const svc = createSales({ db: {}, perms: perms(['SALEDET_VIEW']), repo: { listSales: async (_d, o) => { seen = o.scope; return []; } } });
  const r = await svc.list(user(5, 'user'), { status: 'deleted' });
  assert.strictEqual(seen, 'active');
  assert.strictEqual(r.body.status, 'active');
  assert.strictEqual(r.body.total, 0);
  assert.strictEqual(r.body.pages, 1);
});

test('list: can flags follow the rights; a view-only user has no add or edit', async () => {
  assert.deepStrictEqual((await listSvc(['SALEDET_VIEW']).list(user(5, 'user'), {})).body.can,
    { add: false, edit: false, delete: false, details: true, restore: false, seeDeleted: false });
  assert.deepStrictEqual((await listSvc(['SALE_ADD', 'SALE_EDIT']).list(user(5, 'user'), {})).body.can,
    { add: true, edit: true, delete: false, details: false, restore: false, seeDeleted: false });
});

test('list: paging maths and the unpriced count are passed on', async () => {
  const body = (await listSvc(['SALEDET_VIEW'], [row({ total_rows: '60', unpriced: '1' })]).list(user(5, 'user'), { page: 2, pageSize: 25 })).body;
  assert.strictEqual(body.total, 60);
  assert.strictEqual(body.pages, 3);
  assert.strictEqual(body.sales[0].unpriced, 1);
});

// ---- service: create / update ----
let auditSeen = null;
const fakeDb = () => ({ txAs: async (name, fn) => { auditSeen = name; return fn({}); } });
const EMP = { empno: '00005', lastname: 'Smith', firstname: 'John', hiredate: '2010-01-01', sepdate: null };
function writer(over = {}) {
  const st = { inserted: null, updated: null, locked: 0 };
  const stored = { transno: 'TR000124', salesdate: '2026-10-01', custno: 'C0001', empno: '00005', is_deleted: false };
  const r = {
    findCustomer: async () => ({ custno: 'C0001' }), findEmployee: async () => EMP,
    lockNumbering: async () => { st.locked += 1; }, nextTransNo: async () => 'TR000125',
    insertSale: async (_c, transno, v) => { st.inserted = { transno, ...v }; return { ...stored, transno, ...v }; },
    findSale: async () => stored,
    updateSale: async (_c, transno, v) => { st.updated = { transno, ...v }; return { ...stored, ...v }; },
    countLinesUnpricedOn: async () => ({ lines: 0, unpriced: 0 }),
    ...over,
  };
  return { svc: createSales({ db: fakeDb(), repo: r, perms: perms([]), today: () => TODAY }), st };
}
const FINE = { custno: 'C0001', empno: '00005', salesdate: '2026-10-05' };

test('create: number is assigned under the lock, the audit name is the actor, the number in the body is ignored', async () => {
  const { svc, st } = writer();
  const r = await svc.create(user(7, 'user'), { ...good, transno: 'TR000001' });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.sale.transno, 'TR000125');
  assert.strictEqual(st.inserted.transno, 'TR000125');
  assert.strictEqual(st.locked, 1);
  assert.strictEqual(auditSeen, 'u7@x.test');
});

test('create: field errors come back together and nothing is saved', async () => {
  const { svc, st } = writer();
  const r = await svc.create(user(7, 'user'), {});
  assert.strictEqual(r.status, 400);
  assert.deepStrictEqual(Object.keys(r.body.errors).sort(), ['custno', 'empno', 'salesdate']);
  assert.strictEqual(st.inserted, null);
});

test('create: unknown or deleted customer / employee is refused beside the field', async () => {
  let r = await writer({ findCustomer: async () => null }).svc.create(user(7, 'user'), good);
  assert.match(r.body.errors.custno, /does not exist or is deleted/);
  r = await writer({ findEmployee: async () => null }).svc.create(user(7, 'user'), good);
  assert.match(r.body.errors.empno, /does not exist or is deleted/);
});

test('create: the salesperson must have been employed on the sales date', async () => {
  let r = await writer({ findEmployee: async () => ({ ...EMP, hiredate: '2026-11-10' }) }).svc.create(user(7, 'user'), good);
  assert.match(r.body.errors.empno, /hired on 2026-11-10/);
  r = await writer({ findEmployee: async () => ({ ...EMP, sepdate: '2026-10-15' }) }).svc.create(user(7, 'user'), good);
  assert.match(r.body.errors.empno, /left on 2026-10-15/);
  r = await writer({ findEmployee: async () => ({ ...EMP, sepdate: '2026-11-01' }) }).svc.create(user(7, 'user'), good); // left on the sales date: fine
  assert.strictEqual(r.status, 201);
});

test('create: runs out of numbers cleanly', async () => {
  const r = await writer({ nextTransNo: async () => null }).svc.create(user(7, 'user'), good);
  assert.strictEqual(r.status, 409);
});

test('update: missing, malformed or deleted sale is 404', async () => {
  assert.strictEqual((await writer().svc.update(user(7, 'user'), 'nope', good)).status, 404);
  assert.strictEqual((await writer({ findSale: async () => null }).svc.update(user(7, 'user'), 'TR000124', good)).status, 404);
  assert.strictEqual((await writer({ findSale: async () => ({ is_deleted: true }) }).svc.update(user(7, 'user'), 'TR000124', good)).status, 404);
});

test('update: changing the customer or salesperson keeps the date and needs no confirmation', async () => {
  const { svc, st } = writer();
  const r = await svc.update(user(7, 'user'), 'TR000124', { ...FINE, salesdate: '2026-10-01', custno: 'C0002' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(st.updated.custno, 'C0002');
  assert.strictEqual(st.updated.transno, 'TR000124');
});

test('update: moving the date over lines asks once, then saves when confirmed', async () => {
  const { svc, st } = writer({ countLinesUnpricedOn: async () => ({ lines: 3, unpriced: 0 }) });
  let r = await svc.update(user(7, 'user'), 'TR000124', FINE);
  assert.strictEqual(r.status, 409);
  assert.deepStrictEqual(r.body.confirm, { lines: 3 });
  assert.match(r.body.error, /re-prices 3 lines/);
  assert.strictEqual(st.updated, null);
  r = await svc.update(user(7, 'user'), 'TR000124', { ...FINE, confirmReprice: 'yes' }); // only a real true counts
  assert.strictEqual(r.status, 409);
  r = await svc.update(user(7, 'user'), 'TR000124', { ...FINE, confirmReprice: true });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(st.updated.salesdate, '2026-10-05');
});

test('update: moving the date to one with no price for a line is refused, even when confirmed', async () => {
  const { svc, st } = writer({ countLinesUnpricedOn: async () => ({ lines: 3, unpriced: 1 }) });
  const r = await svc.update(user(7, 'user'), 'TR000124', { ...FINE, confirmReprice: true });
  assert.strictEqual(r.status, 400);
  assert.match(r.body.errors.salesdate, /1 line has no price on or before 2026-10-05/);
  assert.strictEqual(st.updated, null);
});

test('update: a sale with no lines changes date without asking', async () => {
  const { svc } = writer();
  assert.strictEqual((await svc.update(user(7, 'user'), 'TR000124', FINE)).status, 200);
});

test('update: an old sale keeps a salesperson who no longer fits unless the person or the date is changed', async () => {
  const left = { findEmployee: async () => ({ ...EMP, sepdate: '2000-01-01' }) };
  assert.strictEqual((await writer(left).svc.update(user(7, 'user'), 'TR000124', { ...FINE, salesdate: '2026-10-01', custno: 'C0002' })).status, 200);
  assert.strictEqual((await writer(left).svc.update(user(7, 'user'), 'TR000124', FINE)).status, 400); // date changed: rule applies
});

// ---- who may do what ----
const res = () => ({ code: null, status(c) { this.code = c; return this; }, json() { return this; } });
const go = (mw, req) => new Promise((resolve) => { const r = res(); mw(req, r, () => resolve('next')); setImmediate(() => resolve(r.code)); });

test('API gate: any sales right opens the router; rights from other modules do not', async () => {
  const mw = (rights) => requireRight(perms(rights), ...VIEW_RIGHTS);
  assert.strictEqual(await go(mw([]), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(mw(['CUST_ADD', 'RPT_TOP_SALES']), { user: user(5, 'user') }), 403);
  for (const code of VIEW_RIGHTS) assert.strictEqual(await go(mw([code]), { user: user(5, 'user') }), 'next', code);
  assert.strictEqual(await go(mw([]), { user: admin() }), 'next');
});

test('the list needs a header right or View Sale Details; a line-only right is not enough', async () => {
  const mw = (rights) => requireRight(perms(rights), ...LIST_RIGHTS);
  assert.strictEqual(await go(mw(['SALEDET_ADD', 'SALEDET_EDIT', 'SALEDET_DELETE']), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(mw(['SALEDET_VIEW']), { user: user(5, 'user') }), 'next');
  assert.strictEqual(await go(mw(['SALE_ADD']), { user: user(5, 'user') }), 'next');
});

const SECRET = 's3cret';
function page(role, rights, path, signedIn = true) {
  const u = user(9, role);
  const db = { query: async (sql) => ({ rows: sql.includes('user_id = $1') ? [u] : [] }) };
  const mw = guardPages(db, { sessionSecret: SECRET }, undefined, perms(rights));
  return new Promise((resolve) => {
    const req = { path, headers: signedIn ? { cookie: `hope_sid=${createSessionToken(9, SECRET)}` } : {} };
    const r = { redirect(code, to) { resolve({ redirect: to }); }, status() { return { send: () => resolve({}) }; }, set() {} };
    mw(req, r, (err) => resolve({ next: true, err }));
  });
}

test('page: /sales.html needs a sales right; Admins always open it; spelling tricks do not help', async () => {
  assert.strictEqual((await page('user', [], '/sales.html', false)).redirect, '/login.html');
  assert.strictEqual((await page('user', ['CUST_ADD'], '/sales.html')).redirect, '/home.html');
  assert.strictEqual((await page('user', ['SALEDET_VIEW'], '/sales.html')).next, true);
  assert.strictEqual((await page('user', ['SALE_ADD'], '/SALES.HTML')).next, true);
  assert.strictEqual((await page('user', [], '/%73ales.html')).redirect, '/home.html');
  assert.strictEqual((await page('admin', [], '/sales.html')).next, true);
});

test('menu: Sales opens the Sales screen', () => {
  const mods = [{ module_code: 'SALES', module_name: 'Sales Management' }];
  const m = buildMenu(user(5, 'user'), mods, ['SALES'], { all: false, codes: new Set(['SALEDET_VIEW']) });
  assert.strictEqual(m.modules[0].href, '/sales.html');
});
