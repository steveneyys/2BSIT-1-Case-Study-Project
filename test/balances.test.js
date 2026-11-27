'use strict';

// S4-DEV-06: balance per transaction and per customer.
const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/balanceRepo');
const { createBalances, standing } = require('../src/services/balances');
const { createPermissions } = require('../src/services/permissions');
const { VIEW_RIGHTS } = require('../src/services/payments');
const { requireRight } = require('../src/middleware/permissions');
const { guardPages } = require('../src/middleware/pageGuard');
const { createSessionToken } = require('../src/services/session');

const user = (id, role) => ({ user_id: id, first_name: 'F', last_name: 'L', email: `u${id}@x.test`, role, is_blocked: false, status: 'active' });
const admin = () => user(1, 'admin');
const U = () => user(5, 'user');
const perms = (rights) => createPermissions({ db: {}, repo: { listUserRights: async () => rights } });
const recorder = (rows = []) => { const calls = []; return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows, rowCount: rows.length }; } }; };

// ---- SQL ----
test('balance SQL: total from live lines at the sale-date price; paid from ACTIVE payments only', async () => {
  const db = recorder([]);
  await repo.findSaleFigures(db, 'TR000001');
  const sql = db.calls[0].sql;
  assert.match(sql, /salesdetail_active/);
  assert.match(sql, /payment_active/);
  assert.match(sql, /price_as_of\(d\.prodcode, s\.salesdate\)/);
  assert.deepStrictEqual(db.calls[0].params, ['TR000001']);
});

test('listSalePayments: users never get inactive payments; Admins can ask for them', async () => {
  const db = recorder([]);
  await repo.listSalePayments(db, 'TR000001');
  assert.match(db.calls[0].sql, /AND NOT is_deleted/);
  await repo.listSalePayments(db, 'TR000001', { includeDeleted: true });
  assert.ok(!/AND NOT is_deleted/.test(db.calls[1].sql));
});

test('listCustomerSales: only that customer and only live sales', async () => {
  const db = recorder([]);
  await repo.listCustomerSales(db, 'C0001');
  assert.match(db.calls[0].sql, /s\.custno = \$1 AND NOT s\.is_deleted/);
  assert.deepStrictEqual(db.calls[0].params, ['C0001']);
});

// ---- service ----
const fig = (over = {}) => ({ transno: 'TR000001', salesdate: '2026-10-01', custno: 'C0001', custname: 'Acme ', is_deleted: false, total: '234.50', unpriced: '0', paid: '150.00', ...over });
function svc(over = {}) {
  return createBalances({ db: {}, repo: {
    findSaleFigures: async () => fig(),
    listSalePayments: async (_d, _t, o) => [
      { orno: 'OR000002', paydate: '2026-10-10', amount: '50.00', is_deleted: false },
      { orno: 'OR000003', paydate: '2026-10-12', amount: '25.00', is_deleted: true },
      { orno: 'OR000001', paydate: '2026-10-02', amount: '100.00', is_deleted: false },
    ].filter((p) => o.includeDeleted || !p.is_deleted),
    findCustomer: async () => ({ custno: 'C0001', custname: 'Acme ', is_deleted: false }),
    listCustomerSales: async () => [fig({ transno: 'TR000002', total: '100.10', paid: '0.00' }), fig()],
    ...over,
  } });
}

test('standing: due, settled or overpaid', () => {
  assert.deepStrictEqual([standing(1), standing(0), standing(-1)], ['Balance due', 'Paid in full', 'Overpaid']);
});

test('transaction balance: total - paid = balance, with the active payments behind it', async () => {
  const r = await svc().transaction(U(), 'TR000001');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual([r.body.total, r.body.paid, r.body.balance, r.body.standing, r.body.complete], [234.5, 150, 84.5, 'Balance due', true]);
  assert.deepStrictEqual(r.body.payments.map((p) => [p.orno, p.amount]), [['OR000002', 50], ['OR000001', 100]]);
  assert.deepStrictEqual(r.body.sale, { transno: 'TR000001', salesdate: '2026-10-01', custno: 'C0001', customer: 'Acme', deleted: false });
  assert.strictEqual(r.body.inactivePayments, undefined); // users are not told
});

test('transaction balance: Admins are told how many inactive payments exist, and they are not in the balance', async () => {
  const r = await svc().transaction(admin(), 'TR000001');
  assert.strictEqual(r.body.inactivePayments, 1);
  assert.strictEqual(r.body.payments.length, 2);
  assert.strictEqual(r.body.paid, 150);
});

test('transaction balance: no payments yet is the full total; paid in full and overpaid are named', async () => {
  const none = (await svc({ findSaleFigures: async () => fig({ paid: '0' }), listSalePayments: async () => [] }).transaction(U(), 'TR000001')).body;
  assert.deepStrictEqual([none.balance, none.payments, none.standing], [234.5, [], 'Balance due']);
  assert.strictEqual((await svc({ findSaleFigures: async () => fig({ paid: '234.50' }) }).transaction(U(), 'TR000001')).body.standing, 'Paid in full');
  const over = (await svc({ findSaleFigures: async () => fig({ paid: '300.00' }) }).transaction(U(), 'TR000001')).body;
  assert.deepStrictEqual([over.balance, over.standing], [-65.5, 'Overpaid']);
});

test('transaction balance: sale lines with no price make the total incomplete and say so', async () => {
  const b = (await svc({ findSaleFigures: async () => fig({ unpriced: '2' }) }).transaction(U(), 'TR000001')).body;
  assert.deepStrictEqual([b.unpriced, b.complete], [2, false]);
});

test('transaction balance: money is exact in cents', async () => {
  const b = (await svc({ findSaleFigures: async () => fig({ total: '0.30', paid: '0.10' }) }).transaction(U(), 'TR000001')).body;
  assert.strictEqual(b.balance, 0.2);
});

test('transaction balance: bad number or missing sale is 404; a deleted sale only for Admins', async () => {
  assert.strictEqual((await svc().transaction(U(), 'nope')).status, 404);
  assert.strictEqual((await svc({ findSaleFigures: async () => null }).transaction(admin(), 'TR000001')).status, 404);
  const gone = { findSaleFigures: async () => fig({ is_deleted: true }) };
  assert.strictEqual((await svc(gone).transaction(U(), 'TR000001')).status, 404);
  const a = await svc(gone).transaction(admin(), 'TR000001');
  assert.strictEqual(a.status, 200);
  assert.strictEqual(a.body.sale.deleted, true);
});

test('customer balance: each live sale with total / paid / balance, and the customer balance is their sum', async () => {
  const r = await svc().customer(U(), 'c0001');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body.customer, { custno: 'C0001', name: 'Acme', deleted: false });
  assert.deepStrictEqual(r.body.sales.map((s) => [s.transno, s.total, s.paid, s.balance]), [['TR000002', 100.1, 0, 100.1], ['TR000001', 234.5, 150, 84.5]]);
  assert.deepStrictEqual([r.body.total, r.body.paid, r.body.balance, r.body.standing], [334.6, 150, 184.6, 'Balance due']);
});

test('customer balance: a customer with no sales has a zero balance; unpriced lines are counted across sales', async () => {
  const none = (await svc({ listCustomerSales: async () => [] }).customer(U(), 'C0001')).body;
  assert.deepStrictEqual([none.sales, none.balance, none.standing], [[], 0, 'Paid in full']);
  const part = (await svc({ listCustomerSales: async () => [fig({ unpriced: '1' }), fig({ unpriced: '2' })] }).customer(U(), 'C0001')).body;
  assert.deepStrictEqual([part.unpriced, part.complete], [3, false]);
});

test('customer balance: bad code or missing customer is 404; a deleted customer only for Admins', async () => {
  assert.strictEqual((await svc().customer(U(), 'C 1')).status, 404);
  assert.strictEqual((await svc({ findCustomer: async () => null }).customer(admin(), 'C0001')).status, 404);
  const gone = { findCustomer: async () => ({ custno: 'C0001', custname: 'Acme', is_deleted: true }) };
  assert.strictEqual((await svc(gone).customer(U(), 'C0001')).status, 404);
  assert.strictEqual((await svc(gone).customer(admin(), 'C0001')).status, 200);
});

// ---- who may do what ----
const res = () => ({ code: null, status(c) { this.code = c; return this; }, json() { return this; } });
const go = (mw, req) => new Promise((resolve) => { const r = res(); mw(req, r, () => resolve('next')); setImmediate(() => resolve(r.code)); });

test('API gate: the rights that open the Sales list open balances; line-only and other modules do not', async () => {
  const gate = (rights) => requireRight(perms(rights), ...VIEW_RIGHTS);
  assert.strictEqual(await go(gate(['SALEDET_ADD', 'RPT_TOP_SALES']), { user: U() }), 403);
  assert.strictEqual(await go(gate(['SALEDET_VIEW']), { user: U() }), 'next');
  assert.strictEqual(await go(gate([]), { user: admin() }), 'next');
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

test('pages: both balance screens need a right that opens the Sales list; Admins always open them', async () => {
  for (const p of ['/balance.html', '/customer-balance.html']) {
    assert.strictEqual((await page('user', [], p, false)).redirect, '/login.html');
    assert.strictEqual((await page('user', ['SALEDET_EDIT'], p)).redirect, '/home.html');
    assert.strictEqual((await page('user', ['SALE_EDIT'], p)).next, true);
    assert.strictEqual((await page('admin', [], p)).next, true);
  }
  assert.strictEqual((await page('user', [], '/%62alance.html')).redirect, '/home.html');
});
