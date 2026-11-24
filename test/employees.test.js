'use strict';

const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/employeeRepo');
const { createEmployees, normalizeQuery, VIEW_RIGHTS } = require('../src/services/employees');
const { createPermissions } = require('../src/services/permissions');
const { requireRight } = require('../src/middleware/permissions');
const { guardPages } = require('../src/middleware/pageGuard');
const { buildMenu } = require('../src/services/menu');
const { createSessionToken } = require('../src/services/session');

const user = (id, role) => ({ user_id: id, first_name: 'F', last_name: 'L', email: `u${id}@x.test`, role, is_blocked: false, status: 'active' });
const admin = () => user(1, 'admin');
const perms = (rights) => createPermissions({ db: {}, repo: { listUserRights: async () => rights } });
const recorder = (rows = []) => { const calls = []; return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows }; } }; };

test('normalizeQuery: defaults, trimming, hostile values fall back', () => {
  assert.deepStrictEqual(normalizeQuery({}), { search: '', gender: null, employment: null, status: 'active', sort: 'empno', dir: 'asc', pageSize: 25, page: 1 });
  const n = normalizeQuery({ search: 'x'.repeat(400), gender: 'x', employment: 'gone', sort: 'empno; DROP', dir: 'up', status: 'x', pageSize: '9999', page: '-1' });
  assert.deepStrictEqual([n.search.length, n.gender, n.employment, n.sort, n.dir, n.status, n.pageSize, n.page], [100, null, null, 'empno', 'asc', 'active', 25, 1]);
  assert.strictEqual(normalizeQuery({ gender: 'f' }).gender, 'F');
  assert.strictEqual(normalizeQuery({ employment: 'separated' }).employment, 'separated');
});

test('repo: searches number and both name parts case-insensitively; LIKE characters are escaped; dates come as text', async () => {
  const db = recorder([]);
  await repo.listEmployees(db, { search: '50%_a', limit: 25, offset: 0 });
  const { sql, params } = db.calls[0];
  assert.match(sql, /FROM employee_active/);
  assert.match(sql, /empno ILIKE \$1 OR lastname ILIKE \$1 OR firstname ILIKE \$1/);
  assert.match(sql, /to_char\(hiredate, 'YYYY-MM-DD'\)/);
  assert.strictEqual(params[0], '%50\\%\\_a%');
  assert.doesNotMatch(sql, /salary|jobhistory/i); // salary and history are not in the list
});

test('repo: scope picks view or table; filters and sorts use fixed SQL text only', async () => {
  const db = recorder([]);
  await repo.listEmployees(db, { scope: 'deleted', gender: 'F', employment: 'separated', sort: 'name', dir: 'desc', limit: 10, offset: 20 });
  const { sql, params } = db.calls[0];
  assert.match(sql, /FROM employee\n/);
  assert.match(sql, /AND is_deleted/);
  assert.match(sql, /AND sepdate IS NOT NULL/);
  assert.match(sql, /ORDER BY lower\(lastname\) DESC NULLS LAST, lower\(firstname\) DESC NULLS LAST, empno ASC/);
  assert.deepStrictEqual(params, [null, 'F', 10, 20]);
  await repo.listEmployees(db, { sort: 'x; DROP TABLE employee', employment: 'x; --', scope: 'x', limit: 1, offset: 0 });
  assert.match(db.calls[1].sql, /FROM employee_active/);
  assert.match(db.calls[1].sql, /ORDER BY empno ASC NULLS LAST, empno ASC/);
  assert.doesNotMatch(db.calls[1].sql, /DROP|--/);
});

test('list: only Admins see deleted employees; Status and Stamp are Admin-only; no salary field anywhere', async () => {
  const seen = [];
  const rows = [{ empno: '00007', lastname: 'Reyes ', firstname: 'Ana', gender: 'F', birthdate: '1990-01-02', hiredate: '2020-03-04', sepdate: null, is_deleted: true, stamp: 'DELETE ana 2026-11-24', total: '1' }];
  const r = { listEmployees: async (_d, a) => { seen.push(a.scope); return rows; }, countEmployees: async () => ({ active: 7, deleted: 1, all: 8 }) };
  const svc = createEmployees({ db: {}, repo: r, perms: perms(['EMP_DELETE']) });
  const u = await svc.list(user(5, 'user'), { status: 'deleted' });
  const a = await svc.list(admin(), { status: 'deleted' });
  assert.deepStrictEqual(seen, ['active', 'deleted']);
  assert.strictEqual(u.body.counts, undefined);
  assert.deepStrictEqual(a.body.counts, { active: 7, deleted: 1, all: 8 });
  assert.deepStrictEqual(u.body.employees[0], { empno: '00007', lastname: 'Reyes', firstname: 'Ana', gender: 'F', birthdate: '1990-01-02', hiredate: '2020-03-04', sepdate: null });
  assert.deepStrictEqual([a.body.employees[0].status, a.body.employees[0].stamp, a.body.employees[0].deleted], ['Inactive', 'DELETE ana 2026-11-24', true]);
  assert.deepStrictEqual(u.body.can, { add: false, edit: false, delete: true, restore: false, seeDeleted: false, history: false });
  assert.deepStrictEqual([a.body.can.restore, a.body.can.seeDeleted, a.body.can.history], [true, true, true]);
  assert.doesNotMatch(JSON.stringify(a.body), /salary/i);
});

test('list: History flag follows the View Job History right', async () => {
  const r = { listEmployees: async () => [], countEmployees: async () => ({}) };
  const withR = await createEmployees({ db: {}, repo: r, perms: perms(['EMP_EDIT', 'JOBHIST_VIEW']) }).list(user(5, 'user'), {});
  const without = await createEmployees({ db: {}, repo: r, perms: perms(['EMP_EDIT']) }).list(user(5, 'user'), {});
  assert.deepStrictEqual([withR.body.can.history, without.body.can.history], [true, false]);
});

test('list: paging numbers and empty result', async () => {
  const rows = [{ empno: '00001', total: '55' }];
  const svc = createEmployees({ db: {}, repo: { listEmployees: async () => rows, countEmployees: async () => ({}) }, perms: perms([]) });
  const b = (await svc.list(user(5, 'user'), { pageSize: '25', page: '2' })).body;
  assert.deepStrictEqual([b.total, b.page, b.pages], [55, 2, 3]);
  const e = createEmployees({ db: {}, repo: { listEmployees: async () => [], countEmployees: async () => ({}) }, perms: perms([]) });
  const eb = (await e.list(user(5, 'user'), {})).body;
  assert.deepStrictEqual([eb.total, eb.pages, eb.employees], [0, 1, []]);
});

const res = () => { const r = { code: 200, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; }, redirect(c, to) { r.code = c; r.to = to; return r; }, set() { return r; } }; return r; };
const go = (mw, req) => new Promise((resolve) => { const r = res(); mw(req, r, () => resolve('next')); setImmediate(() => resolve(r.code)); });

test('API gate: needs at least one employee right; rights from other modules do not count (job history alone does not either)', async () => {
  const mw = (rights) => requireRight(perms(rights), ...VIEW_RIGHTS);
  assert.strictEqual(await go(mw([]), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(mw(['CUST_ADD', 'JOB_ADD', 'DEPT_ADD', 'JOBHIST_VIEW']), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(mw(['EMP_EDIT']), { user: user(5, 'user') }), 'next');
  assert.strictEqual(await go(mw([]), { user: admin() }), 'next');
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

test('page: signed out -> login; no employee right -> home; any employee right, or admin -> opens (odd spellings too)', async () => {
  assert.strictEqual((await page('user', [], '/employees.html', false)).redirect, '/login.html');
  assert.strictEqual((await page('user', ['CUST_ADD', 'JOB_ADD'], '/employees.html')).redirect, '/home.html');
  assert.strictEqual((await page('user', ['EMP_ADD'], '/employees.html')).next, true);
  assert.strictEqual((await page('user', ['EMP_DELETE'], '/EMPLOYEES.html')).next, true);
  assert.strictEqual((await page('user', ['EMP_EDIT'], '//employees.html')).next, true);
  assert.strictEqual((await page('user', ['CUST_ADD'], '/%65mployees.html')).redirect, '/home.html');
  assert.strictEqual((await page('admin', [], '/employees.html')).next, true);
});

test('menu: a person with only employee rights lands on Employees; with department rights too, on Departments', () => {
  const hr = [{ module_code: 'HR', module_name: 'Human Resources' }];
  const only = buildMenu(user(5, 'user'), hr, ['HR'], { all: false, codes: new Set(['EMP_ADD']) });
  assert.strictEqual(only.modules[0].href, '/employees.html');
  assert.ok(only.modules[0].pages.includes('/employees.html'));
  const both = buildMenu(user(5, 'user'), hr, ['HR'], { all: false, codes: new Set(['EMP_ADD', 'DEPT_ADD']) });
  assert.strictEqual(both.modules[0].href, '/departments.html');
  assert.ok(both.modules[0].pages.includes('/employees.html'));
});
