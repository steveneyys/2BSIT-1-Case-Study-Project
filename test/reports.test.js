'use strict';

// S4-DEV-04 / 05: the seven reports. Part 1: Product Master List, Active Employees, All Employees, Employee Job History.
// Part 2 (further down): Top Customers, Top Products, Top Sales.
const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/reportRepo');
const { createReports, REPORT_RIGHTS, REPORT_SLUGS } = require('../src/services/reports');
const { createPermissions } = require('../src/services/permissions');
const { requireRight } = require('../src/middleware/permissions');
const { guardPages } = require('../src/middleware/pageGuard');
const { buildMenu } = require('../src/services/menu');
const { createSessionToken } = require('../src/services/session');

const user = (id, role) => ({ user_id: id, first_name: 'F', last_name: 'L', email: `u${id}@x.test`, role, is_blocked: false, status: 'active' });
const admin = () => user(1, 'admin');
const U = () => user(5, 'user');
const perms = (rights) => createPermissions({ db: {}, repo: { listUserRights: async () => rights } });
const recorder = (rows = []) => { const calls = []; return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows, rowCount: rows.length }; } }; };
const TODAY = '2026-11-26';

// ---- repository SQL ----
test('productMaster: live products priced on the given date', async () => {
  const db = recorder([]);
  await repo.productMaster(db, TODAY);
  assert.match(db.calls[0].sql, /products_priced_as_of\(\$1::date\)/);
  assert.deepStrictEqual(db.calls[0].params, [TODAY]);
});

test('employee reports read live rows only and never read salary', async () => {
  const db = recorder([]);
  await repo.activeEmployees(db, TODAY);
  await repo.allEmployees(db);
  await repo.employeeChoices(db);
  for (const c of db.calls) {
    assert.match(c.sql, /employee_active/);
    assert.ok(!/salary/i.test(c.sql));
  }
  assert.match(db.calls[0].sql, /sepdate IS NULL OR sepdate > \$1::date/);
});

test('jobHistory: live rows of one employee, newest first; this is the only report query that reads salary', async () => {
  const db = recorder([]);
  await repo.jobHistory(db, '00005');
  assert.match(db.calls[0].sql, /jobhistory_active/);
  assert.match(db.calls[0].sql, /ORDER BY h\.effdate DESC/);
  assert.deepStrictEqual(db.calls[0].params, ['00005']);
});

// ---- service ----
const EMP = (over = {}) => ({ empno: '00005', lastname: 'Smith ', firstname: 'John', gender: 'M', hiredate: '2010-01-01', sepdate: null, ...over });
function svc(rights, over = {}) {
  const r = {
    productMaster: async () => [{ prodcode: 'AD0001', description: 'Toshiba ', unit: 'ea', unitprice: '1999.99' }, { prodcode: 'AD0002', description: 'Cable', unit: null, unitprice: null }],
    activeEmployees: async () => [EMP()],
    allEmployees: async () => [EMP(), EMP({ empno: '00006', lastname: 'Reyes', firstname: 'Ana', gender: 'F', sepdate: '2020-05-01' })],
    employeeChoices: async () => [{ empno: '00005', lastname: 'Smith', firstname: 'John' }],
    findEmployee: async (_d, empno) => (empno === '00005' ? { empno, lastname: 'Smith', firstname: 'John' } : null),
    jobHistory: async () => [{ empno: '00005', effdate: '2020-01-01', jobcode: 'J1', jobdesc: 'Engineer ', deptcode: 'D1', deptname: 'IT', salary: '40000.00' }],
    ...over,
  };
  return createReports({ db: {}, repo: r, perms: perms(rights), today: () => TODAY });
}

test('index: lists only the reports the person holds a right for; Admins get all seven', async () => {
  assert.deepStrictEqual((await svc(['RPT_PRODUCT_MASTER']).index(U())).body.reports.map((r) => r.slug), ['product-master']);
  assert.deepStrictEqual((await svc([]).index(U())).body.reports, []);
  assert.deepStrictEqual((await svc([]).index(admin())).body.reports.map((r) => r.slug), REPORT_SLUGS);
});

test('every report is closed to someone without its right: 403 and no rows', async () => {
  for (const slug of REPORT_SLUGS) {
    const r = await svc(REPORT_RIGHTS.filter((x) => x !== svc([]).defs[slug].right)).run(U(), slug, { empno: '00005' });
    assert.strictEqual(r.status, 403, slug);
    assert.strictEqual(r.body.rows, undefined, slug);
  }
  assert.strictEqual((await svc([]).run(U(), 'nope')).status, 404);
  assert.strictEqual((await svc([]).run(admin(), '__proto__')).status, 404);
});

test('product master: code, description, unit, current price; no price shows as null, never 0', async () => {
  const b = (await svc(['RPT_PRODUCT_MASTER']).run(U(), 'product-master')).body;
  assert.deepStrictEqual(b.rows, [
    { prodcode: 'AD0001', description: 'Toshiba', unit: 'ea', unitprice: 1999.99 },
    { prodcode: 'AD0002', description: 'Cable', unit: null, unitprice: null },
  ]);
  assert.strictEqual(b.count, 2);
  assert.strictEqual(b.asOf, TODAY);
  assert.deepStrictEqual(b.columns.map((c) => c.key), ['prodcode', 'description', 'unit', 'unitprice']);
});

test('employee reports: no salary anywhere in the response; gender spelled out; separation date shown', async () => {
  for (const [slug, right] of [['active-employees', 'RPT_ACTIVE_EMPLOYEES'], ['all-employees', 'RPT_ALL_EMPLOYEES']]) {
    const b = (await svc([right]).run(U(), slug)).body;
    assert.ok(!/salary/i.test(JSON.stringify(b)), slug);
    assert.deepStrictEqual(b.columns.map((c) => c.key), ['empno', 'name', 'gender', 'hiredate', 'sepdate']);
  }
  const all = (await svc(['RPT_ALL_EMPLOYEES']).run(U(), 'all-employees')).body;
  assert.deepStrictEqual(all.rows[1], { empno: '00006', name: 'Reyes, Ana', gender: 'Female', hiredate: '2010-01-01', sepdate: '2020-05-01' });
  assert.strictEqual(all.count, 2);
});

test('job history: needs the report right AND View Job History; without the second there are no rows and no salary', async () => {
  const noView = await svc(['RPT_EMP_JOB_HISTORY']).run(U(), 'employee-job-history', { empno: '00005' });
  assert.strictEqual(noView.status, 403);
  assert.match(noView.body.error, /Job history access is required/);
  assert.ok(!/40000|salary|rows/i.test(JSON.stringify(noView.body)));
  const ok = await svc(['RPT_EMP_JOB_HISTORY', 'JOBHIST_VIEW']).run(U(), 'employee-job-history', { empno: '00005' });
  assert.strictEqual(ok.status, 200);
  assert.deepStrictEqual(ok.body.rows, [{ empno: '00005', effdate: '2020-01-01', job: 'Engineer', department: 'IT', salary: 40000 }]);
  assert.strictEqual(ok.body.subject, '00005 · Smith, John');
  assert.strictEqual((await svc([]).run(admin(), 'employee-job-history', { empno: '00005' })).status, 200);
});

test('job history: no employee chosen gives the choices and a prompt, not data; bad or unknown employee is refused', async () => {
  const s = svc(['RPT_EMP_JOB_HISTORY', 'JOBHIST_VIEW']);
  const none = (await s.run(U(), 'employee-job-history', {})).body;
  assert.deepStrictEqual(none.rows, []);
  assert.match(none.prompt, /Choose an employee/);
  assert.deepStrictEqual(none.filters.employees, [{ empno: '00005', name: 'Smith, John' }]);
  assert.strictEqual((await s.run(U(), 'employee-job-history', { empno: '12' })).status, 400);
  assert.strictEqual((await s.run(U(), 'employee-job-history', { empno: '99999' })).status, 404);
});

// ---- who may do what ----
const res = () => ({ code: null, status(c) { this.code = c; return this; }, json() { return this; } });
const go = (mw, req) => new Promise((resolve) => { const r = res(); mw(req, r, () => resolve('next')); setImmediate(() => resolve(r.code)); });

test('API gate: any report right opens the router; other modules do not', async () => {
  const gate = (rights) => requireRight(perms(rights), ...REPORT_RIGHTS);
  assert.strictEqual(await go(gate([]), { user: U() }), 403);
  assert.strictEqual(await go(gate(['SALE_ADD', 'JOBHIST_VIEW', 'EMP_ADD']), { user: U() }), 403);
  for (const code of REPORT_RIGHTS) assert.strictEqual(await go(gate([code]), { user: U() }), 'next', code);
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

test('pages: Reports screens need a report right; Admins always open them', async () => {
  for (const p of ['/reports.html', '/report.html']) {
    assert.strictEqual((await page('user', [], p, false)).redirect, '/login.html');
    assert.strictEqual((await page('user', ['SALE_ADD'], p)).redirect, '/home.html');
    assert.strictEqual((await page('user', ['RPT_ALL_EMPLOYEES'], p)).next, true);
    assert.strictEqual((await page('admin', [], p)).next, true);
  }
  assert.strictEqual((await page('user', ['RPT_PRODUCT_MASTER'], '/REPORTS.HTML')).next, true);
  assert.strictEqual((await page('user', [], '/%72eport.html')).redirect, '/home.html');
});

test('menu: the Reports tile opens the Reports page and report.html keeps the tab lit', () => {
  const mods = [{ module_code: 'REPORTS', module_name: 'Reports' }];
  const m = buildMenu(U(), mods, ['REPORTS'], { all: false, codes: new Set(['RPT_PRODUCT_MASTER']) }).modules[0];
  assert.strictEqual(m.href, '/reports.html');
  assert.deepStrictEqual(m.pages, ['/report.html']);
});

// ================= S4-DEV-05: Top Customers, Top Products, Top Sales =================
const { parseRange } = require('../src/validators/report');

test('parseRange: real dates, From on or before To, Top N a whole number from 1 to 100', () => {
  assert.deepStrictEqual(parseRange({ from: '2026-10-01', to: '2026-10-24', topn: '10' }), { errors: {}, value: { from: '2026-10-01', to: '2026-10-24', topn: 10 } });
  assert.deepStrictEqual(parseRange({ from: '2026-10-24', to: '2026-10-24', topn: 1 }).errors, {}); // same day is fine
  assert.deepStrictEqual(Object.keys(parseRange({}).errors).sort(), ['from', 'to', 'topn']);
  assert.match(parseRange({ from: '2026-10-25', to: '2026-10-24', topn: '5' }).errors.from, /on or before the To date/);
  assert.match(parseRange({ from: '2026-02-30', to: '2026-10-24', topn: '5' }).errors.from, /real date/);
  for (const bad of ['0', '-1', '2.5', 'abc', '1e1']) assert.match(parseRange({ from: '2026-01-01', to: '2026-02-01', topn: bad }).errors.topn, /whole number greater than 0/, bad);
  assert.match(parseRange({ from: '2026-01-01', to: '2026-02-01', topn: '101' }).errors.topn, /more than 100/);
});

test('ranked SQL: live sales and live lines only, priced on the SALE date, unpriced lines left out, limit is a parameter', async () => {
  const f = { from: '2026-10-01', to: '2026-10-24', topn: 10 };
  for (const name of ['topCustomers', 'topProducts', 'topSales']) {
    const db = recorder([]);
    await repo[name](db, f);
    const { sql, params } = db.calls[0];
    assert.match(sql, /sales_active/, name);
    assert.match(sql, /salesdetail_active/, name);
    assert.match(sql, /price_as_of\(d\.prodcode, s\.salesdate\)/, name);
    assert.match(sql, /BETWEEN \$1::date AND \$2::date/, name);
    assert.match(sql, /price IS NOT NULL/, name);
    assert.match(sql, /DESC/, name);
    assert.match(sql, /LIMIT \$3/, name);
    assert.deepStrictEqual(params, ['2026-10-01', '2026-10-24', 10], name);
  }
  const db = recorder([{ n: '2' }]);
  assert.strictEqual(await repo.unpricedLines(db, f), 2);
  assert.match(db.calls[0].sql, /price IS NULL/);
});

const RANK_RIGHTS = { 'top-customers': 'RPT_TOP_CUSTOMERS', 'top-products': 'RPT_TOP_PRODUCTS', 'top-sales': 'RPT_TOP_SALES' };
const RQ = { from: '2026-10-01', to: '2026-10-24', topn: '10' };
function rank(rights, over = {}) {
  return svc(rights, {
    topCustomers: async () => [{ custno: 'C0001', custname: 'Globus ', amount: '500.255' }, { custno: 'C0002', custname: null, amount: '100.10' }],
    topProducts: async () => [{ prodcode: 'AD0001', description: 'Toshiba ', quantity: '12.00', amount: '300.30' }],
    topSales: async () => [{ transno: 'TR000007', salesdate: '2026-10-05', custno: 'C0001', custname: 'Globus', amount: '250.10' }],
    unpricedLines: async () => 0,
    ...over,
  });
}

test('ranked reports are closed to someone without their right: 403, no rows', async () => {
  for (const [slug, right] of Object.entries(RANK_RIGHTS)) {
    const r = await rank(REPORT_RIGHTS.filter((x) => x !== right)).run(U(), slug, RQ);
    assert.strictEqual(r.status, 403, slug);
    assert.strictEqual(r.body.rows, undefined, slug);
  }
});

test('ranked reports: nothing runs until the filters are sent; the screen gets default filters and a prompt', async () => {
  let ran = false;
  const s = rank(['RPT_TOP_CUSTOMERS'], { topCustomers: async () => { ran = true; return []; } });
  const b = (await s.run(U(), 'top-customers', {})).body;
  assert.strictEqual(ran, false);
  assert.deepStrictEqual(b.filters, { kind: 'range', from: '2026-01-01', to: TODAY, topn: 10 });
  assert.deepStrictEqual(b.rows, []);
  assert.match(b.prompt, /generate the report/);
});

test('top customers: ranked 1..n with name, amount to the cent, and a total of the rows listed', async () => {
  const b = (await rank(['RPT_TOP_CUSTOMERS']).run(U(), 'top-customers', RQ)).body;
  assert.deepStrictEqual(b.columns.map((c) => c.key), ['rank', 'custno', 'customer', 'amount']);
  assert.deepStrictEqual(b.rows, [{ rank: 1, custno: 'C0001', customer: 'Globus', amount: 500.26 }, { rank: 2, custno: 'C0002', customer: '—', amount: 100.1 }]);
  assert.strictEqual(b.total, 600.36);
  assert.strictEqual(b.subject, 'Period 2026-10-01 to 2026-10-24 · Top 10');
  assert.strictEqual(b.count, 2);
  assert.strictEqual(b.note, undefined);
});

test('top products and top sales: their own columns and amounts', async () => {
  const p = (await rank(['RPT_TOP_PRODUCTS']).run(U(), 'top-products', RQ)).body;
  assert.deepStrictEqual(p.rows[0], { rank: 1, prodcode: 'AD0001', description: 'Toshiba', quantity: 12, amount: 300.3 });
  const t = (await rank(['RPT_TOP_SALES']).run(U(), 'top-sales', RQ)).body;
  assert.deepStrictEqual(t.rows[0], { rank: 1, transno: 'TR000007', salesdate: '2026-10-05', customer: 'Globus', amount: 250.1 });
  assert.strictEqual(t.total, 250.1);
});

test('ranked reports: the filters are passed to the query as validated values', async () => {
  let seen;
  const s = rank(['RPT_TOP_SALES'], { topSales: async (_d, f) => { seen = f; return []; } });
  await s.run(U(), 'top-sales', { from: '2026-10-01', to: '2026-10-24', topn: '3' });
  assert.deepStrictEqual(seen, { from: '2026-10-01', to: '2026-10-24', topn: 3 });
});

test('ranked reports: bad filters are 400 with a message per field and nothing is queried', async () => {
  let ran = false;
  const s = rank(['RPT_TOP_SALES'], { topSales: async () => { ran = true; return []; } });
  const r = await s.run(U(), 'top-sales', { from: '2026-10-25', to: '2026-10-24', topn: '0' });
  assert.strictEqual(r.status, 400);
  assert.deepStrictEqual(Object.keys(r.body.errors).sort(), ['from', 'topn']);
  assert.strictEqual(ran, false);
});

test('ranked reports: an empty range says so; unpriced lines are mentioned, never guessed', async () => {
  const empty = (await rank(['RPT_TOP_SALES'], { topSales: async () => [] }).run(U(), 'top-sales', RQ)).body;
  assert.deepStrictEqual([empty.rows, empty.total, empty.count], [[], 0, 0]);
  assert.match(empty.prompt, /No sales in this date range/);
  const unpriced = (await rank(['RPT_TOP_SALES'], { unpricedLines: async () => 2 }).run(U(), 'top-sales', RQ)).body;
  assert.match(unpriced.note, /2 sale lines have no price on the sale date and are left out/);
  const one = (await rank(['RPT_TOP_SALES'], { unpricedLines: async () => 1 }).run(U(), 'top-sales', RQ)).body;
  assert.match(one.note, /1 sale line has no price on the sale date and is left out/);
});
