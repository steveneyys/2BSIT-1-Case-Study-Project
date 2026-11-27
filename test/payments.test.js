'use strict';

// S4-DEV-03: payments list and Record Payment against a sale.
const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/paymentRepo');
const { createPayments, normalizeQuery, VIEW_RIGHTS, RECORD_RIGHT, balanceOf } = require('../src/services/payments');
const { validatePayment, parseAmount } = require('../src/validators/payment');
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
const good = { orno: 'or000125', paydate: '2026-11-20', amount: '1500.5', transno: 'tr000001' };

// ---- validation ----
test('parseAmount: more than 0, 2 decimals at most, max 99,999,999.99, never negative', () => {
  assert.strictEqual(parseAmount('1500.5').value, '1500.50');
  assert.strictEqual(parseAmount(' 0.01 ').value, '0.01');
  assert.strictEqual(parseAmount(250).value, '250.00');
  assert.strictEqual(parseAmount('99999999.99').value, '99999999.99');
  assert.match(parseAmount('').error, /Enter the payment amount/);
  assert.match(parseAmount('-5').error, /negative/);
  assert.match(parseAmount('0').error, /more than 0/);
  assert.match(parseAmount('0.00').error, /more than 0/);
  assert.match(parseAmount('1.234').error, /2 decimal/);
  for (const bad of ['abc', '1,000', '1e5', '12.', '.5']) assert.match(parseAmount(bad).error, /number/, bad);
  assert.match(parseAmount('100000000').error, /too large/);
});

test('validatePayment: required fields, upper-cased codes, real date not in the future', () => {
  assert.deepStrictEqual(Object.keys(validatePayment({}, { today: TODAY }).errors).sort(), ['amount', 'orno', 'paydate', 'transno']);
  const ok = validatePayment(good, { today: TODAY });
  assert.deepStrictEqual([ok.errors, ok.value], [{}, { orno: 'OR000125', paydate: '2026-11-20', amount: '1500.50', transno: 'TR000001' }]);
  assert.match(validatePayment({ ...good, paydate: '2026-11-27' }, { today: TODAY }).errors.paydate, /future/);
  assert.deepStrictEqual(validatePayment({ ...good, paydate: TODAY }, { today: TODAY }).errors, {});
  assert.match(validatePayment({ ...good, paydate: '2026-02-30' }, { today: TODAY }).errors.paydate, /real date/);
  assert.ok(validatePayment({ ...good, orno: 'OR 1' }, { today: TODAY }).errors.orno);
  assert.ok(validatePayment({ ...good, orno: 'ORNUMBER9' }, { today: TODAY }).errors.orno);
  assert.ok(validatePayment({ ...good, transno: 'T-001' }, { today: TODAY }).errors.transno);
});

test('validatePayment: a payment date before the sale date is not refused (seed data has some)', () => {
  assert.deepStrictEqual(validatePayment({ ...good, paydate: '2001-01-01' }, { today: TODAY }).errors, {});
});

test('normalizeQuery: safe defaults, newest receipt first', () => {
  assert.deepStrictEqual(normalizeQuery({ sort: 'x; DROP', status: 'zzz', pageSize: '7', page: '0', search: ' OR0 ' }),
    { search: 'OR0', status: 'active', sort: 'orno', dir: 'desc', pageSize: 25, page: 1 });
});

// ---- repository SQL ----
test('listPayments: searches receipt, sale and customer; escapes wildcards; fixed sort list; scope', async () => {
  const db = recorder([]);
  await repo.listPayments(db, { search: '5%_', scope: 'active', sort: 'amount; DROP', dir: 'asc', limit: 25, offset: 0 });
  const { sql, params } = db.calls[0];
  assert.deepStrictEqual(params, ['%5\\%\\_%', 25, 0]);
  assert.match(sql, /p\.orno ILIKE \$1/);
  assert.match(sql, /c\.custname ILIKE \$1/);
  assert.match(sql, /NOT p\.is_deleted/);
  assert.ok(!/DROP/.test(sql));
  await repo.listPayments(db, { scope: 'deleted', sort: 'date', dir: 'desc', limit: 10, offset: 0 });
  assert.match(db.calls[1].sql, /AND p\.is_deleted/);
  await repo.listPayments(db, { scope: 'all', limit: 10, offset: 0 });
  assert.ok(!/is_deleted/.test(db.calls[2].sql.split('WHERE')[1].split('ORDER')[0]));
});

test('balance SQL: total from active lines at the sale-date price, paid from ACTIVE payments only, live sales only', async () => {
  const db = recorder([]);
  await repo.findSaleBalance(db, 'TR000001');
  const sql = db.calls[0].sql;
  assert.match(sql, /sales_active/);
  assert.match(sql, /salesdetail_active/);
  assert.match(sql, /payment_active/);
  assert.match(sql, /price_as_of\(d\.prodcode, s\.salesdate\)/);
  await repo.listPayableSales(db, { search: 'glo', limit: 200 });
  assert.match(db.calls[1].sql, /- b\.paid::numeric > 0/); // only sales that still owe money
  assert.deepStrictEqual(db.calls[1].params, ['%glo%', 200]);
});

test('suggestOrNo: OR + 6 digits, one more than the highest used (deleted receipts keep their number)', async () => {
  assert.strictEqual(await repo.suggestOrNo(recorder([{ next: '125' }])), 'OR000125');
  assert.strictEqual(await repo.suggestOrNo(recorder([{ next: '1000000' }])), null);
  const db = recorder([{ next: '1' }]);
  await repo.suggestOrNo(db);
  assert.ok(!/payment_active/.test(db.calls[0].sql));
});

test('insertPayment / lock / findAnyPayment: parameters in order; the lock is per sale; duplicates look at the whole table', async () => {
  const db = recorder([{ orno: 'OR000125' }]);
  await repo.insertPayment(db, { orno: 'OR000125', paydate: '2026-11-20', amount: '1500.50', transno: 'TR000001' });
  assert.deepStrictEqual(db.calls[0].params, ['OR000125', '2026-11-20', '1500.50', 'TR000001']);
  await repo.lockSalePayments(db, 'TR000001');
  assert.match(db.calls[1].sql, /pg_advisory_xact_lock/);
  await repo.findAnyPayment(db, 'OR000125');
  assert.ok(!/payment_active/.test(db.calls[2].sql));
});

// ---- service: list and options ----
const row = (over = {}) => ({ orno: 'OR000001', paydate: '2026-10-01', amount: '3284.70', transno: 'TR000001', custno: 'C0001', custname: 'Globus ', is_deleted: false, stamp: 'S', total_rows: '1', ...over });
const listSvc = (rights, rows = [row()]) => createPayments({
  db: {}, today: () => TODAY, perms: perms(rights),
  repo: { listPayments: async () => rows, countPayments: async () => ({ active: 1, deleted: 0, all: 1 }) },
});

test('list: users get live payments with no Status or Stamp; Admins get both and tab counts', async () => {
  const u = (await listSvc(['SALEDET_VIEW']).list(user(5, 'user'), {})).body;
  assert.deepStrictEqual(u.payments[0], { orno: 'OR000001', paydate: '2026-10-01', amount: 3284.7, transno: 'TR000001', custno: 'C0001', customer: 'Globus' });
  assert.strictEqual(u.counts, undefined);
  assert.deepStrictEqual(u.can, { record: false, seeDeleted: false });
  const a = (await listSvc([]).list(admin(), { status: 'all' })).body;
  assert.strictEqual(a.payments[0].status, 'Active');
  assert.deepStrictEqual(a.counts, { active: 1, deleted: 0, all: 1 });
  assert.deepStrictEqual(a.can, { record: true, seeDeleted: true });
});

test('list: a user cannot ask for inactive payments; only Edit Sale can record', async () => {
  let seen;
  const svc = createPayments({ db: {}, perms: perms([RECORD_RIGHT]), repo: { listPayments: async (_d, o) => { seen = o.scope; return []; } } });
  const r = await svc.list(user(5, 'user'), { status: 'deleted' });
  assert.strictEqual(seen, 'active');
  assert.strictEqual(r.body.can.record, true);
  assert.strictEqual(r.body.pages, 1);
});

test('options: suggested receipt number, today, and sales with their total, paid and balance', async () => {
  const svc = createPayments({ db: {}, today: () => TODAY, perms: perms([]), repo: {
    suggestOrNo: async () => 'OR000125',
    listPayableSales: async () => [{ transno: 'TR000001', salesdate: '2026-10-01', custno: 'C0001', custname: 'Globus ', total: '1000.10', paid: '400.05', unpriced: '0' }],
  } });
  const b = (await svc.options({})).body;
  assert.deepStrictEqual([b.orno, b.today], ['OR000125', TODAY]);
  assert.deepStrictEqual(b.sales[0], { transno: 'TR000001', salesdate: '2026-10-01', custno: 'C0001', customer: 'Globus', total: 1000.1, paid: 400.05, balance: 600.05, complete: true });
});

test('balanceOf: exact in cents', () => {
  assert.strictEqual(balanceOf({ total: '0.30', paid: '0.10' }), 20);
  assert.strictEqual(balanceOf({ total: '1500.505', paid: '0' }), 150051);
});

// ---- service: record ----
let auditSeen = null;
const fakeDb = () => ({ txAs: async (name, fn) => { auditSeen = name; return fn({}); } });
const SALE = { transno: 'TR000001', custno: 'C0001', custname: 'Globus', total: '2000.00', paid: '500.00', unpriced: '0' };
function recorderSvc(over = {}) {
  const st = { inserted: null, locked: 0 };
  const r = {
    lockSalePayments: async () => { st.locked += 1; },
    findAnyPayment: async () => null,
    findSaleBalance: async () => SALE,
    insertPayment: async (_c, v) => { st.inserted = v; return { orno: v.orno, paydate: v.paydate, amount: v.amount, transno: v.transno }; },
    ...over,
  };
  return { svc: createPayments({ db: fakeDb(), repo: r, perms: perms([]), today: () => TODAY }), st };
}

const PAY = { ...good, amount: '1000' };

test('record: saved under the sale lock with the actor as the audit name; reply carries the new balance', async () => {
  const { svc, st } = recorderSvc();
  const r = await svc.create(user(7, 'user'), PAY);
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(st.inserted, { orno: 'OR000125', paydate: '2026-11-20', amount: '1000.00', transno: 'TR000001' });
  assert.strictEqual(r.body.balance, 500); // 2000 - 500 already paid - 1000
  assert.deepStrictEqual(r.body.payment, { orno: 'OR000125', paydate: '2026-11-20', amount: 1000, transno: 'TR000001', custno: 'C0001', customer: 'Globus' });
  assert.strictEqual(st.locked, 1);
  assert.strictEqual(auditSeen, 'u7@x.test');
});

test('record: paying the exact balance is allowed; one cent more is refused beside the amount', async () => {
  const { svc } = recorderSvc();
  assert.strictEqual((await svc.create(user(7, 'user'), { ...PAY, amount: '1500' })).body.balance, 0);
  const r = await svc.create(user(7, 'user'), { ...PAY, amount: '1500.01' });
  assert.strictEqual(r.status, 400);
  assert.match(r.body.errors.amount, /more than the balance of this sale \(1500\.00\)/);
});

test('record: field errors together and nothing is saved', async () => {
  const { svc, st } = recorderSvc();
  const r = await svc.create(user(7, 'user'), { amount: '-5' });
  assert.strictEqual(r.status, 400);
  assert.deepStrictEqual(Object.keys(r.body.errors).sort(), ['amount', 'orno', 'paydate', 'transno']);
  assert.strictEqual(st.inserted, null);
});

test('record: a receipt number already used is refused, deleted ones too, without touching the sale', async () => {
  let r = await recorderSvc({ findAnyPayment: async () => ({ orno: 'OR000125', is_deleted: false }) }).svc.create(user(7, 'user'), PAY);
  assert.strictEqual(r.status, 409);
  assert.match(r.body.errors.orno, /already used/);
  r = await recorderSvc({ findAnyPayment: async () => ({ orno: 'OR000125', is_deleted: true }) }).svc.create(user(7, 'user'), PAY);
  assert.match(r.body.errors.orno, /inactive payment/);
});

test('record: two people saving the same receipt number at once get the duplicate message', async () => {
  const { svc } = recorderSvc({ insertPayment: async () => { const e = new Error('dup'); e.code = '23505'; throw e; } });
  assert.match((await svc.create(user(7, 'user'), PAY)).body.errors.orno, /already used/);
});

test('record: unknown or deleted sale, sale with nothing left, and sale with unpriced lines are all refused beside the sale field', async () => {
  let r = await recorderSvc({ findSaleBalance: async () => null }).svc.create(user(7, 'user'), PAY);
  assert.strictEqual(r.status, 400);
  assert.match(r.body.errors.transno, /does not exist or is deleted/);
  r = await recorderSvc({ findSaleBalance: async () => ({ ...SALE, paid: '2000.00' }) }).svc.create(user(7, 'user'), PAY);
  assert.match(r.body.errors.transno, /no balance left/);
  r = await recorderSvc({ findSaleBalance: async () => ({ ...SALE, total: '0', paid: '0' }) }).svc.create(user(7, 'user'), PAY);
  assert.match(r.body.errors.transno, /no balance left/);
  r = await recorderSvc({ findSaleBalance: async () => ({ ...SALE, unpriced: '2' }) }).svc.create(user(7, 'user'), PAY);
  assert.match(r.body.errors.transno, /no price/);
});

// ---- who may do what ----
const res = () => ({ code: null, status(c) { this.code = c; return this; }, json() { return this; } });
const go = (mw, req) => new Promise((resolve) => { const r = res(); mw(req, r, () => resolve('next')); setImmediate(() => resolve(r.code)); });

test('API gate: any right that opens the Sales list opens payments; line-only and other modules do not; recording needs Edit Sale', async () => {
  const gate = (rights) => requireRight(perms(rights), ...VIEW_RIGHTS);
  assert.strictEqual(await go(gate([]), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(gate(['SALEDET_ADD', 'SALEDET_EDIT', 'CUST_ADD']), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(gate(['SALEDET_VIEW']), { user: user(5, 'user') }), 'next');
  assert.strictEqual(await go(gate([]), { user: admin() }), 'next');
  const record = (rights) => requireRight(perms(rights), RECORD_RIGHT);
  assert.strictEqual(await go(record(['SALE_ADD', 'SALE_DELETE', 'SALEDET_VIEW']), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(record(['SALE_EDIT']), { user: user(5, 'user') }), 'next');
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

test('page: /payments.html needs a right that opens the Sales list; Admins always open it', async () => {
  assert.strictEqual((await page('user', [], '/payments.html', false)).redirect, '/login.html');
  assert.strictEqual((await page('user', ['SALEDET_ADD'], '/payments.html')).redirect, '/home.html');
  assert.strictEqual((await page('user', ['CUST_ADD'], '/payments.html')).redirect, '/home.html');
  assert.strictEqual((await page('user', ['SALEDET_VIEW'], '/payments.html')).next, true);
  assert.strictEqual((await page('user', ['SALE_EDIT'], '/PAYMENTS.HTML')).next, true);
  assert.strictEqual((await page('user', [], '/%70ayments.html')).redirect, '/home.html');
  assert.strictEqual((await page('admin', [], '/payments.html')).next, true);
});

test('menu: Sales has two screens; the tile opens the first one the person may use; every Sales page keeps the tab lit', () => {
  const mods = [{ module_code: 'SALES', module_name: 'Sales Management' }];
  const codes = (...c) => ({ all: false, codes: new Set(c) });
  assert.strictEqual(buildMenu(user(5, 'user'), mods, ['SALES'], codes('SALEDET_VIEW')).modules[0].href, '/sales.html');
  const m = buildMenu(user(5, 'user'), mods, ['SALES'], codes('SALE_EDIT')).modules[0];
  assert.deepStrictEqual(m.pages, ['/sales.html', '/payments.html', '/sale.html']);
});
