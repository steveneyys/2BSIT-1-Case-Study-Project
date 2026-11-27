'use strict';

// S4-DEV-04: reports part 1 (Product Master List, Active Employees, All Employees, Employee Job History).
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

test('index: lists only the reports the person holds a right for; Admins get all four', async () => {
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
  assert.strictEqual(await go(gate(['SALE_ADD', 'JOBHIST_VIEW', 'RPT_TOP_SALES']), { user: U() }), 403); // part 2 right is not built yet
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
