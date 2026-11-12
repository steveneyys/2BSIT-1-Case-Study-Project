'use strict';

const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/productRepo');
const { createProducts, normalizeQuery, VIEW_RIGHTS } = require('../src/services/products');
const { createPermissions } = require('../src/services/permissions');
const { requireRight } = require('../src/middleware/permissions');
const { guardPages } = require('../src/middleware/pageGuard');
const { buildMenu } = require('../src/services/menu');
const { createSessionToken } = require('../src/services/session');

const user = (id, role) => ({ user_id: id, first_name: 'F', last_name: 'L', email: `u${id}@x.test`, role, is_blocked: false, status: 'active' });
const perms = (rights) => createPermissions({ db: {}, repo: { listUserRights: async () => rights } });
const recorder = (rows = []) => { const calls = []; return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows }; } }; };

test('normalizeQuery: defaults, trimming, case-insensitive unit, bounded paging', () => {
  assert.deepStrictEqual(normalizeQuery({}), { search: '', unit: null, sort: 'description', dir: 'asc', pageSize: 25, page: 1 });
  assert.deepStrictEqual(
    normalizeQuery({ search: '  SSD ', unit: 'EA', sort: 'price', dir: 'desc', pageSize: '50', page: '2' }),
    { search: 'SSD', unit: 'ea', sort: 'price', dir: 'desc', pageSize: 50, page: 2 }
  );
});

test('normalizeQuery: hostile values fall back instead of reaching the database', () => {
  const n = normalizeQuery({ search: 'x'.repeat(400), unit: "ea'; DROP TABLE product;--", sort: 'description; DROP', dir: 'up', pageSize: '9999', page: '-1' });
  assert.deepStrictEqual([n.search.length, n.unit, n.sort, n.dir, n.pageSize, n.page], [100, null, 'description', 'asc', 25, 1]);
});

test('SQL: active view, current price as of the Manila business day, parameterized, LIKE escaped', async () => {
  const db = recorder();
  await repo.listProducts(db, { search: '50%_', unit: 'ea', sort: 'code', dir: 'asc', limit: 25, offset: 0 });
  const { sql, params } = db.calls[0];
  assert.match(sql, /FROM product_active p/);
  assert.match(sql, /FROM pricehist h/);
  assert.match(sql, /NOT h\.is_deleted/);                                  // deleted prices are ignored
  assert.match(sql, /h\.effdate <= \(now\(\) AT TIME ZONE 'Asia\/Manila'\)::date/); // future-dated prices are not "current"
  assert.match(sql, /ORDER BY h\.effdate DESC\s+LIMIT 1/);                  // newest price wins
  assert.match(sql, /to_char\(cp\.effdate, 'YYYY-MM-DD'\)/);              // date stays plain text
  assert.strictEqual(params[0], '%50\\%\\_%');
  assert.deepStrictEqual(params.slice(1), ['ea', 25, 0]);
});

test('SQL: sort comes from a fixed list; products without a price sort last either way', async () => {
  const db = recorder();
  await repo.listProducts(db, { sort: 'description; DROP TABLE product', dir: 'desc; --', limit: 10, offset: 0 });
  assert.match(db.calls[0].sql, /ORDER BY lower\(p\.description\) ASC NULLS LAST, p\.prodcode ASC/);
  await repo.listProducts(db, { sort: 'price', dir: 'desc', limit: 10, offset: 0 });
  assert.match(db.calls[1].sql, /ORDER BY cp\.unitprice DESC NULLS LAST, p\.prodcode ASC/);
  assert.strictEqual(db.calls[1].params[0], null);
});

test('list: maps rows (trims the description, price as a number, no price -> null) and reports rights', async () => {
  const rows = [
    { prodcode: 'AD0001', description: 'WD Ultra 1TB ', unit: 'ea', unitprice: '1250.50', effdate: '2026-10-01', total: '41' },
    { prodcode: 'AD0009', description: 'New item', unit: 'pc', unitprice: null, effdate: null, total: '41' },
  ];
  const svc = createProducts({ db: {}, repo: { listProducts: async (_d, a) => { svc.last = a; return rows; } }, perms: perms(['PROD_EDIT', 'PRICE_ADD']) });
  const r = await svc.list(user(5, 'user'), { pageSize: '10', page: '3' });
  assert.deepStrictEqual(r.body.products[0], { code: 'AD0001', description: 'WD Ultra 1TB', unit: 'ea', price: 1250.5, priceDate: '2026-10-01' });
  assert.deepStrictEqual(r.body.products[1], { code: 'AD0009', description: 'New item', unit: 'pc', price: null, priceDate: null });
  assert.deepStrictEqual([r.body.total, r.body.pages, svc.last.limit, svc.last.offset], [41, 5, 10, 20]);
  assert.deepStrictEqual(r.body.can, { add: false, edit: true, delete: false, addPrice: true, editPrice: false, deletePrice: false });
});

test('list: empty result is page 1 of 1; admins can do everything', async () => {
  const r = await createProducts({ db: {}, repo: { listProducts: async () => [] }, perms: perms([]) }).list(user(1, 'admin'), {});
  assert.deepStrictEqual([r.body.total, r.body.pages, r.body.products.length], [0, 1, 0]);
  assert.ok(Object.values(r.body.can).every(Boolean));
});

function run(mw, req) {
  return new Promise((resolve) => {
    const res = { status(code) { this.code = code; return this; }, json(body) { resolve({ code: this.code, body }); } };
    mw(req, res, (err) => resolve({ next: true, err }));
  });
}

test('API gate: signed out -> 401; no product or price right -> 403; any one of the six, or admin -> allowed', async () => {
  const gate = (rights) => requireRight(perms(rights), ...VIEW_RIGHTS);
  assert.strictEqual((await run(gate([]), {})).code, 401);
  assert.strictEqual((await run(gate(['CUST_ADD', 'HR_ADD']), { user: user(5, 'user') })).code, 403);
  for (const r of VIEW_RIGHTS) assert.strictEqual((await run(gate([r]), { user: user(5, 'user') })).next, true, r);
  assert.strictEqual((await run(gate([]), { user: user(2, 'admin') })).next, true);
});

const SECRET = 's3cret';
function page(role, rights, path, signedIn = true) {
  const u = user(9, role);
  const db = { query: async (sql) => ({ rows: sql.includes('user_id = $1') ? [u] : [] }) };
  const mw = guardPages(db, { sessionSecret: SECRET }, undefined, perms(rights));
  return new Promise((resolve) => {
    const req = { path, headers: signedIn ? { cookie: `hope_sid=${createSessionToken(9, SECRET)}` } : {} };
    const res = { redirect(code, to) { resolve({ redirect: to }); }, status(code) { return { send: () => resolve({ code }) }; }, set() {} };
    mw(req, res, (err) => resolve({ next: true, err }));
  });
}

test('page: signed out -> login; no product right -> home; any product or price right, or admin -> opens', async () => {
  assert.strictEqual((await page('user', [], '/products.html', false)).redirect, '/login.html');
  assert.strictEqual((await page('user', ['CUST_ADD'], '/products.html')).redirect, '/home.html');
  assert.strictEqual((await page('user', ['PRICE_EDIT'], '/products.html')).next, true);
  assert.strictEqual((await page('user', ['PROD_ADD'], '/PRODUCTS.html')).next, true);
  assert.strictEqual((await page('admin', [], '/products.html')).next, true);
});

test('menu: the Product tile links to the product page', () => {
  const modules = [{ module_code: 'CUSTOMER', module_name: 'Customer Management' }, { module_code: 'PRODUCT', module_name: 'Product Management' }];
  const m = buildMenu(user(5, 'user'), modules, ['PRODUCT']);
  assert.deepStrictEqual(m.modules.map((x) => [x.code, x.href]), [['PRODUCT', '/products.html']]);
});

// ---- S2-DEV-05: create / edit ----
const { validateProduct } = require('../src/validators/product');

test('validateProduct: required fields, code format, limits, unit list', () => {
  assert.deepStrictEqual(Object.keys(validateProduct({}, { needCode: true }).errors).sort(), ['code', 'description', 'unit']);
  assert.ok(validateProduct({ code: 'A1', description: 'x', unit: 'ea' }, { needCode: true }).errors.code);
  assert.ok(validateProduct({ code: 'AD0001', description: 'x'.repeat(31), unit: 'ea' }, { needCode: true }).errors.description);
  assert.ok(validateProduct({ code: 'AD0001', description: '   ', unit: 'ea' }, { needCode: true }).errors.description);
  assert.ok(validateProduct({ code: 'AD0001', description: 'x', unit: 'box' }, { needCode: true }).errors.unit);
  const ok = validateProduct({ code: ' ad0001 ', description: ' SSD ', unit: 'EA' }, { needCode: true });
  assert.deepStrictEqual([ok.errors, ok.value], [{}, { code: 'AD0001', description: 'SSD', unit: 'ea' }]);
  assert.deepStrictEqual(validateProduct({ code: 'ZZ9999', description: 'x', unit: 'pc' }).value, { description: 'x', unit: 'pc' }); // edit ignores code
});

let auditSeen;
const fakeDb = () => ({ txAs: async (name, fn) => { auditSeen = name; return fn({}); } });

test('create: 201 on success and audit name is the actor; taken / deleted-code conflicts give 409', async () => {
  const db = fakeDb();
  let existing = null;
  const repoFake = { findAnyProduct: async () => existing, insertProduct: async (_c, v) => ({ prodcode: v.code, description: v.description, unit: v.unit }) };
  const svc = createProducts({ db, repo: repoFake, perms: perms([]) });
  const body = { code: 'ad0010', description: 'Cable', unit: 'mtr' };
  const r = await svc.create(user(5, 'user'), body);
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.product.code, 'AD0010');
  assert.strictEqual(auditSeen, 'u5@x.test');
  existing = { is_deleted: false };
  assert.match((await svc.create(user(5, 'user'), body)).body.errors.code, /already in use/);
  existing = { is_deleted: true };
  const d = await svc.create(user(5, 'user'), body);
  assert.strictEqual(d.status, 409);
  assert.match(d.body.errors.code, /deleted product/);
  assert.strictEqual((await svc.create(user(5, 'user'), {})).status, 400);
});

test('create: unique violation from a simultaneous add becomes 409', async () => {
  const repoFake = { findAnyProduct: async () => null, insertProduct: async () => { throw Object.assign(new Error('dup'), { code: '23505' }); } };
  const r = await createProducts({ db: fakeDb(), repo: repoFake, perms: perms([]) }).create(user(5, 'user'), { code: 'AD0010', description: 'x', unit: 'pc' });
  assert.strictEqual(r.status, 409);
});

test('update: 404 for bad/missing/deleted code, 200 otherwise, code in body ignored', async () => {
  let args;
  const repoFake = { updateProduct: async (_c, code, v) => { args = [code, v]; return code === 'AD0001' ? { prodcode: code, ...v } : null; } };
  const svc = createProducts({ db: fakeDb(), repo: repoFake, perms: perms([]) });
  assert.strictEqual((await svc.update(user(5, 'user'), 'bad', { description: 'x', unit: 'pc' })).status, 404);
  assert.strictEqual((await svc.update(user(5, 'user'), 'AD0002', { description: 'x', unit: 'pc' })).status, 404);
  const r = await svc.update(user(5, 'user'), 'AD0001', { code: 'ZZ0000', description: ' New ', unit: 'PC' });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(args, ['AD0001', { description: 'New', unit: 'pc' }]);
  assert.strictEqual((await svc.update(user(5, 'user'), 'AD0001', { description: '', unit: 'pc' })).status, 400);
});

test('SQL: update only touches live rows; insert is parameterized', async () => {
  const db = recorder([{ prodcode: 'AD0001' }]);
  await repo.updateProduct(db, 'AD0001', { description: 'x', unit: 'pc' });
  assert.match(db.calls[0].sql, /WHERE prodcode = \$1 AND NOT is_deleted/);
  await repo.insertProduct(db, { code: 'AD0002', description: 'x', unit: 'pc' });
  assert.deepStrictEqual(db.calls[1].params, ['AD0002', 'x', 'pc']);
});
