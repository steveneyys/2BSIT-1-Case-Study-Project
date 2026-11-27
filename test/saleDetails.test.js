'use strict';

// S4-DEV-02: sale details (lines): view, add, edit, delete, restore; unit price as of the sales date.
const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/saleDetailRepo');
const { createSaleDetails } = require('../src/services/saleDetails');
const { validateLine, parseQuantity } = require('../src/validators/saleDetail');
const { createPermissions } = require('../src/services/permissions');
const { guardPages } = require('../src/middleware/pageGuard');
const { buildMenu } = require('../src/services/menu');
const { createSessionToken } = require('../src/services/session');

const user = (id, role) => ({ user_id: id, first_name: 'F', last_name: 'L', email: `u${id}@x.test`, role, is_blocked: false, status: 'active' });
const admin = () => user(1, 'admin');
const perms = (rights) => createPermissions({ db: {}, repo: { listUserRights: async () => rights } });
const recorder = (rows = [], rowCount = 1) => { const calls = []; return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows, rowCount }; } }; };

// ---- quantity and line validation ----
test('parseQuantity: whole number from 1 to 99,999,999', () => {
  assert.strictEqual(parseQuantity('5').value, 5);
  assert.strictEqual(parseQuantity(12).value, 12);
  assert.strictEqual(parseQuantity(' 99999999 ').value, 99999999);
  assert.match(parseQuantity('').error, /Enter the quantity/);
  assert.match(parseQuantity('0').error, /at least 1/);
  assert.match(parseQuantity('-3').error, /negative/);
  assert.match(parseQuantity('2.5').error, /whole number/);
  assert.match(parseQuantity('abc').error, /whole number/);
  assert.match(parseQuantity('1e3').error, /whole number/);
  assert.match(parseQuantity('100000000').error, /too large/);
});

test('validateLine: required fields, product upper-cased, transaction number in the body ignored', () => {
  assert.deepStrictEqual(Object.keys(validateLine({}).errors).sort(), ['prodcode', 'quantity']);
  const ok = validateLine({ prodcode: 'ad0001', quantity: '3', transno: 'TR000009' });
  assert.deepStrictEqual([ok.errors, ok.value], [{}, { prodcode: 'AD0001', quantity: 3 }]);
  assert.ok(validateLine({ prodcode: 'AD 01', quantity: 1 }).errors.prodcode);
  assert.ok(validateLine({ prodcode: 'TOOLONG1', quantity: 1 }).errors.prodcode);
});

// ---- repository SQL ----
test('listLines: price comes from price_as_of on the SALE date; users never get deleted lines', async () => {
  const db = recorder([]);
  await repo.listLines(db, 'TR000001');
  assert.match(db.calls[0].sql, /price_as_of\(d\.prodcode, s\.salesdate\)/);
  assert.match(db.calls[0].sql, /AND NOT d\.is_deleted/);
  await repo.listLines(db, 'TR000001', { includeDeleted: true });
  assert.ok(!/AND NOT d\.is_deleted/.test(db.calls[1].sql));
});

test('findProduct / listProducts: live products only, priced on the given date', async () => {
  const db = recorder([{ prodcode: 'AD0001' }]);
  await repo.findProduct(db, 'AD0001', '2026-10-01');
  assert.match(db.calls[0].sql, /product_active/);
  assert.match(db.calls[0].sql, /price_as_of\(prodcode, \$2::date\)/);
  assert.deepStrictEqual(db.calls[0].params, ['AD0001', '2026-10-01']);
  await repo.listProducts(db, '2026-10-01');
  assert.match(db.calls[1].sql, /products_priced_as_of\(\$1::date\)/);
});

test('updateLine / softDelete / restore: only touch rows in the right state', async () => {
  const db = recorder([{ prodcode: 'AD0002' }]);
  await repo.updateLine(db, 'TR000001', 'AD0001', { prodcode: 'AD0002', quantity: 4 });
  assert.match(db.calls[0].sql, /NOT is_deleted/);
  assert.deepStrictEqual(db.calls[0].params, ['TR000001', 'AD0001', 'AD0002', 4]);
  await repo.softDeleteLine(db, 'TR000001', 'AD0001');
  assert.deepStrictEqual(db.calls[2].params, ['TR000001', 'AD0001', true, false]); // only a live line can be deleted
  await repo.restoreLine(db, 'TR000001', 'AD0001');
  assert.deepStrictEqual(db.calls[4].params, ['TR000001', 'AD0001', false, true]); // only a deleted line can be restored
  assert.strictEqual(await repo.updateLine(recorder([], 0), 'TR000001', 'AD0001', { prodcode: 'AD0001', quantity: 1 }), null);
  const lock = recorder([]);
  await repo.lockSale(lock, 'TR000001');
  assert.match(lock.calls[0].sql, /pg_advisory_xact_lock/);
});

// ---- view ----
const SALE = { transno: 'TR000001', salesdate: '2026-10-01', custno: 'C0001', custname: 'Globus ', empno: '00005', lastname: 'Smith', firstname: 'John', is_deleted: false };
const LINES = [
  { prodcode: 'AD0001', description: 'Toshiba Canvio ', unit: 'ea', quantity: '10.00', unitprice: '1999.99', is_deleted: false, stamp: 'S1' },
  { prodcode: 'AD0002', description: 'Cable', unit: 'pc', quantity: '3.00', unitprice: null, is_deleted: false, stamp: 'S2' },
  { prodcode: 'AD0003', description: 'Gone', unit: 'pc', quantity: '5.00', unitprice: '10.00', is_deleted: true, stamp: 'DELETE x' },
];
const PRODUCTS = [{ prodcode: 'AD0001', description: 'Toshiba Canvio', unit: 'ea', unitprice: '1999.99' }, { prodcode: 'AD0002', description: 'Cable', unit: 'pc', unitprice: null }];
const viewSvc = (rights, sale = SALE) => createSaleDetails({
  db: {}, perms: perms(rights),
  saleRepo: { findSale: async () => sale },
  repo: { listLines: async (_d, _t, o) => (o.includeDeleted ? LINES : LINES.filter((l) => !l.is_deleted)), listProducts: async () => PRODUCTS },
});

test('view: users see live lines only with unit price, line amount and a total; unpriced lines are counted, not guessed', async () => {
  const b = (await viewSvc(['SALEDET_VIEW']).view(user(5, 'user'), 'TR000001')).body;
  assert.strictEqual(b.lines.length, 2);
  assert.deepStrictEqual(b.lines[0], { prodcode: 'AD0001', product: 'Toshiba Canvio', unit: 'ea', quantity: 10, unitprice: 1999.99, amount: 19999.9 });
  assert.deepStrictEqual([b.lines[1].unitprice, b.lines[1].amount], [null, null]);
  assert.strictEqual(b.total, 19999.9); // the deleted line and the unpriced line are not in it
  assert.strictEqual(b.unpriced, 1);
  assert.strictEqual(b.lines[0].status, undefined);
  assert.strictEqual(b.options, undefined); // view-only: no product list
  assert.deepStrictEqual(b.can, { add: false, edit: false, delete: false, restore: false, seeDeleted: false });
  assert.strictEqual(b.sale.employee, 'Smith, John');
});

test('view: Admins also get deleted lines with Status and Stamp, but the deleted line stays out of the total', async () => {
  const b = (await viewSvc([]).view(admin(), 'TR000001')).body;
  assert.strictEqual(b.lines.length, 3);
  assert.deepStrictEqual([b.lines[2].status, b.lines[2].stamp, b.lines[2].deleted], ['Inactive', 'DELETE x', true]);
  assert.strictEqual(b.total, 19999.9);
  assert.strictEqual(b.can.restore, true);
  assert.strictEqual(b.can.seeDeleted, true);
  assert.ok(b.options.length === 2);
});

test('view: product choices only for people who can add or edit; money is exact in cents', async () => {
  assert.ok((await viewSvc(['SALEDET_VIEW', 'SALEDET_ADD']).view(user(5, 'user'), 'TR000001')).body.options);
  const odd = createSaleDetails({ db: {}, perms: perms(['SALEDET_VIEW']), saleRepo: { findSale: async () => SALE },
    repo: { listLines: async () => [{ prodcode: 'A', quantity: '3.00', unitprice: '0.10', is_deleted: false }] } });
  assert.strictEqual((await odd.view(user(5, 'user'), 'TR000001')).body.total, 0.3); // 3 x 0.10, not 0.30000000000000004
});

test('view: missing sale and bad number are 404; a deleted sale is visible to Admins only, with no change buttons', async () => {
  assert.strictEqual((await viewSvc(['SALEDET_VIEW']).view(user(5, 'user'), 'bad')).status, 404);
  assert.strictEqual((await createSaleDetails({ db: {}, perms: perms([]), saleRepo: { findSale: async () => null }, repo: {} }).view(admin(), 'TR000001')).status, 404);
  const gone = { ...SALE, is_deleted: true };
  assert.strictEqual((await viewSvc(['SALEDET_VIEW']).view(user(5, 'user'), 'TR000001', gone)).status, 200); // sale stub is the live one: sanity
  assert.strictEqual((await viewSvc(['SALEDET_VIEW'], gone).view(user(5, 'user'), 'TR000001')).status, 404);
  const a = (await viewSvc([], gone).view(admin(), 'TR000001')).body;
  assert.deepStrictEqual(a.can, { add: false, edit: false, delete: false, restore: false, seeDeleted: true });
  assert.strictEqual(a.options, undefined);
});

// ---- add / edit / delete / restore ----
let auditSeen = null;
const fakeDb = () => ({ txAs: async (name, fn) => { auditSeen = name; return fn({}); } });
function writer(over = {}, saleOver = {}, rights = ['SALEDET_VIEW']) {
  const st = { inserted: null, updated: null, deleted: null, restored: null, locked: 0 };
  const row = (prodcode, quantity) => ({ prodcode, description: 'Toshiba', unit: 'ea', quantity: String(quantity), unitprice: '100.00', is_deleted: false });
  const r = {
    lockSale: async () => { st.locked += 1; },
    findProduct: async (_c, prodcode) => ({ prodcode, unitprice: '100.00' }),
    findLiveLine: async () => null, findLine: async () => null,
    insertLine: async (_c, _t, v) => { st.inserted = v; return row(v.prodcode, v.quantity); },
    updateLine: async (_c, t, p, v) => { st.updated = { p, ...v }; return row(v.prodcode, v.quantity); },
    softDeleteLine: async (_c, t, p) => { st.deleted = p; return row(p, 1); },
    restoreLine: async (_c, t, p) => { st.restored = p; return row(p, 1); },
    ...over,
  };
  const saleRepo = { findSale: async () => ({ ...SALE, ...saleOver }) };
  return { svc: createSaleDetails({ db: fakeDb(), repo: r, saleRepo, perms: perms(rights) }), st };
}
const LINE = { prodcode: 'ad0001', quantity: '4' };

test('add: saved under the lock with the actor as the audit name; amount is quantity x price as of the sales date', async () => {
  const { svc, st } = writer();
  const r = await svc.create(user(7, 'user'), 'TR000001', LINE);
  assert.strictEqual(r.status, 201);
  assert.deepStrictEqual(st.inserted, { prodcode: 'AD0001', quantity: 4 });
  assert.strictEqual(r.body.line.amount, 400);
  assert.strictEqual(st.locked, 1);
  assert.strictEqual(auditSeen, 'u7@x.test');
});

test('add: field errors together; nothing is saved', async () => {
  const { svc, st } = writer();
  const r = await svc.create(user(7, 'user'), 'TR000001', { quantity: '0' });
  assert.strictEqual(r.status, 400);
  assert.deepStrictEqual(Object.keys(r.body.errors).sort(), ['prodcode', 'quantity']);
  assert.strictEqual(st.inserted, null);
});

test('add: a product with no price on the sales date is refused, never saved at 0.00', async () => {
  const { svc, st } = writer({ findProduct: async (_c, prodcode) => ({ prodcode, unitprice: null }) });
  const r = await svc.create(user(7, 'user'), 'TR000001', LINE);
  assert.strictEqual(r.status, 400);
  assert.match(r.body.errors.prodcode, /No applicable price for this sale date\. A price effective on or before 2026-10-01 is required\. Do not save this line at ₱0\.00\./);
  assert.strictEqual(st.inserted, null);
});

test('add: unknown or deleted product is refused beside the field', async () => {
  const { svc } = writer({ findProduct: async () => null });
  assert.match((await svc.create(user(7, 'user'), 'TR000001', LINE)).body.errors.prodcode, /does not exist or is deleted/);
});

test('add: the same product twice is refused; a deleted line for it points to the Admin', async () => {
  let r = await writer({ findLiveLine: async () => ({ prodcode: 'AD0001' }) }).svc.create(user(7, 'user'), 'TR000001', LINE);
  assert.strictEqual(r.status, 409);
  assert.match(r.body.errors.prodcode, /already has a line/);
  r = await writer({ findLine: async () => ({ prodcode: 'AD0001', is_deleted: true }) }).svc.create(user(7, 'user'), 'TR000001', LINE);
  assert.match(r.body.errors.prodcode, /deleted line.*Admin can restore/);
});

test('add: two people adding the same product at once get the duplicate message (unique violation)', async () => {
  const { svc } = writer({ insertLine: async () => { const e = new Error('dup'); e.code = '23505'; throw e; } });
  assert.strictEqual((await svc.create(user(7, 'user'), 'TR000001', LINE)).status, 409);
});

test('add / edit / delete: no change to a deleted sale or a missing one', async () => {
  const gone = writer({}, { is_deleted: true }).svc;
  assert.match((await gone.create(user(7, 'user'), 'TR000001', LINE)).body.error, /Restore the sale first/);
  const state = { findLine: async () => ({ prodcode: 'AD0001', is_deleted: false }) };
  const gone2 = writer(state, { is_deleted: true }).svc;
  assert.strictEqual((await gone2.update(user(7, 'user'), 'TR000001', 'AD0001', LINE)).status, 409);
  assert.strictEqual((await gone2.remove(user(7, 'user'), 'TR000001', 'AD0001')).status, 409);
  assert.strictEqual((await writer().svc.create(user(7, 'user'), 'nope', LINE)).status, 404);
});

test('edit: quantity or product can change; the line must exist and be live', async () => {
  const live = { findLine: async (_c, _t, p) => (p === 'AD0001' ? { prodcode: 'AD0001', is_deleted: false } : null) };
  const { svc, st } = writer(live);
  const r = await svc.update(user(7, 'user'), 'TR000001', 'AD0001', { prodcode: 'AD0009', quantity: 7 });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(st.updated, { p: 'AD0001', prodcode: 'AD0009', quantity: 7 });
  assert.strictEqual((await writer().svc.update(user(7, 'user'), 'TR000001', 'AD0001', LINE)).status, 404); // no such line
  const del = { findLine: async () => ({ prodcode: 'AD0001', is_deleted: true }) };
  assert.strictEqual((await writer(del).svc.update(user(7, 'user'), 'TR000001', 'AD0001', LINE)).status, 404); // deleted line
});

test('edit: keeping the same product is not a duplicate of itself; moving onto another live line is', async () => {
  let seenExcept = 'unset';
  const live = { findLine: async () => ({ prodcode: 'AD0001', is_deleted: false }), findLiveLine: async (_c, _t, _p, except) => { seenExcept = except; return null; } };
  assert.strictEqual((await writer(live).svc.update(user(7, 'user'), 'TR000001', 'AD0001', { prodcode: 'AD0001', quantity: 9 })).status, 200);
  assert.strictEqual(seenExcept, 'AD0001');
  const clash = { findLine: async () => ({ prodcode: 'AD0001', is_deleted: false }), findLiveLine: async () => ({ prodcode: 'AD0002' }) };
  assert.strictEqual((await writer(clash).svc.update(user(7, 'user'), 'TR000001', 'AD0001', { prodcode: 'AD0002', quantity: 1 })).status, 409);
});

test('edit: re-checks the price on the sales date', async () => {
  const live = { findLine: async () => ({ prodcode: 'AD0001', is_deleted: false }), findProduct: async (_c, p) => ({ prodcode: p, unitprice: null }) };
  assert.match((await writer(live).svc.update(user(7, 'user'), 'TR000001', 'AD0001', LINE)).body.errors.prodcode, /No applicable price/);
});

test('delete: soft deletes the line; missing line is 404', async () => {
  const { svc, st } = writer();
  assert.strictEqual((await svc.remove(user(7, 'user'), 'TR000001', 'AD0001')).status, 200);
  assert.strictEqual(st.deleted, 'AD0001');
  assert.strictEqual((await writer({ softDeleteLine: async () => null }).svc.remove(user(7, 'user'), 'TR000001', 'AD0001')).status, 404);
  assert.strictEqual((await svc.remove(user(7, 'user'), 'TR000001', 'bad key')).status, 404);
});

test('restore: Admin only; the line must be deleted and its product live', async () => {
  const gone = { findLine: async () => ({ prodcode: 'AD0001', is_deleted: true }) };
  assert.strictEqual((await writer(gone).svc.restore(user(7, 'user'), 'TR000001', 'AD0001')).status, 403);
  const { svc, st } = writer(gone);
  assert.strictEqual((await svc.restore(admin(), 'TR000001', 'AD0001')).status, 200);
  assert.strictEqual(st.restored, 'AD0001');
  assert.strictEqual((await writer().svc.restore(admin(), 'TR000001', 'AD0001')).status, 404); // not deleted / not there
  const noProd = { ...gone, findProduct: async () => null };
  assert.match((await writer(noProd).svc.restore(admin(), 'TR000001', 'AD0001')).body.error, /Restore the product first/);
  const trig = { ...gone, restoreLine: async () => { throw new Error('Cannot save salesdetail record: product AD0001 is deleted. Restore it first.'); } };
  assert.strictEqual((await writer(trig).svc.restore(admin(), 'TR000001', 'AD0001')).status, 409);
});

test('replies to someone without View Sale Details carry the line key only: no price, amount or product', async () => {
  const rights = ['SALEDET_ADD', 'SALEDET_EDIT', 'SALEDET_DELETE'];
  const u = user(7, 'user');
  const live = { findLine: async () => ({ prodcode: 'AD0001', is_deleted: false }) };
  const replies = [
    await writer({}, {}, rights).svc.create(u, 'TR000001', LINE),
    await writer(live, {}, rights).svc.update(u, 'TR000001', 'AD0001', LINE),
    await writer({}, {}, rights).svc.remove(u, 'TR000001', 'AD0001'),
  ];
  for (const r of replies) {
    assert.ok(r.status < 300);
    assert.deepStrictEqual(r.body, { line: { prodcode: r.body.line.prodcode } });
    assert.ok(!/100|Toshiba|amount/.test(JSON.stringify(r.body)));
  }
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

test('page: /sale.html needs View Sale Details (a change right alone is not enough); Admins always open it', async () => {
  assert.strictEqual((await page('user', [], '/sale.html', false)).redirect, '/login.html');
  assert.strictEqual((await page('user', ['SALE_ADD', 'SALEDET_ADD', 'SALEDET_EDIT'], '/sale.html')).redirect, '/home.html');
  assert.strictEqual((await page('user', ['SALEDET_VIEW'], '/sale.html')).next, true);
  assert.strictEqual((await page('user', ['SALEDET_VIEW'], '/SALE.HTML')).next, true);
  assert.strictEqual((await page('user', [], '/%73ale.html')).redirect, '/home.html');
  assert.strictEqual((await page('admin', [], '/sale.html')).next, true);
});

test('menu: the sale details screen keeps the Sales tab lit', () => {
  const mods = [{ module_code: 'SALES', module_name: 'Sales Management' }];
  const m = buildMenu(user(5, 'user'), mods, ['SALES'], { all: false, codes: new Set(['SALEDET_VIEW']) });
  assert.strictEqual(m.modules[0].href, '/sales.html');
  assert.ok(m.modules[0].pages.includes('/sale.html'));
});
