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

// ================= S3-DEV-04: Add and Edit =================
const { validateEmployee, parseDate } = require('../src/validators/employee');
const TODAY = '2026-11-24';
const good = { empno: '00015', lastname: ' Cruz ', firstname: 'Ana', gender: 'f', birthdate: '1990-01-02', hiredate: '2020-03-04', sepdate: '' };

test('validateEmployee: a good record is trimmed and normalised; empty separation date becomes null', () => {
  const r = validateEmployee(good, { needEmpno: true, today: TODAY });
  assert.deepStrictEqual(r.errors, {});
  assert.deepStrictEqual(r.value, { empno: '00015', lastname: 'Cruz', firstname: 'Ana', gender: 'F', birthdate: '1990-01-02', hiredate: '2020-03-04', sepdate: null });
  assert.deepStrictEqual(validateEmployee({ ...good, empno: '99999' }, { today: TODAY }).value.empno, undefined); // edit ignores any number in the body
});

test('validateEmployee: required fields, lengths, gender, number format', () => {
  assert.deepStrictEqual(Object.keys(validateEmployee({}, { needEmpno: true, today: TODAY }).errors).sort(), ['birthdate', 'empno', 'firstname', 'gender', 'hiredate', 'lastname']);
  for (const bad of ['1', '123456', 'ABCDE', '12 45', '１２３４５']) assert.ok(validateEmployee({ ...good, empno: bad }, { needEmpno: true, today: TODAY }).errors.empno, bad);
  assert.ok(validateEmployee({ ...good, lastname: 'x'.repeat(16) }, { today: TODAY }).errors.lastname); // TC-EMP-18
  assert.ok(validateEmployee({ ...good, firstname: 'x'.repeat(16) }, { today: TODAY }).errors.firstname);
  assert.ok(validateEmployee({ ...good, lastname: '   ' }, { today: TODAY }).errors.lastname); // TC-EMP-14
  assert.ok(validateEmployee({ ...good, firstname: '' }, { today: TODAY }).errors.firstname); // TC-EMP-15
  assert.match(validateEmployee({ ...good, gender: 'X' }, { today: TODAY }).errors.gender, /M or F/); // TC-EMP-17
  assert.strictEqual(validateEmployee({ ...good, lastname: 'x'.repeat(15) }, { today: TODAY }).errors.lastname, undefined);
});

test('validateEmployee: date rules', () => {
  const v = (o) => validateEmployee({ ...good, ...o }, { today: TODAY }).errors;
  assert.ok(v({ hiredate: '1989-12-31' }).hiredate); // hire before birth, TC-EMP-20
  assert.ok(v({ hiredate: '1990-01-02' }).hiredate); // same day as birth
  assert.ok(v({ sepdate: '2020-03-03' }).sepdate); // before hire, TC-EMP-21
  assert.deepStrictEqual(v({ sepdate: '2020-03-04' }), {}); // on the hire date is fine, TC-EMP-22
  assert.deepStrictEqual(v({ sepdate: '2024-01-01' }), {});
  assert.ok(v({ birthdate: '2026-11-25' }).birthdate); // future birth date
  for (const bad of ['2026-02-30', '2026-13-01', '26-1-1', 'tomorrow', '1899-01-01']) assert.ok(v({ birthdate: bad }).birthdate, bad);
  assert.ok(v({ sepdate: 'soon' }).sepdate);
  assert.strictEqual(parseDate('2024-02-29'), '2024-02-29');
  assert.strictEqual(parseDate('2023-02-29'), null);
});

const fakeDb = (seen = {}) => ({ txAs: async (name, fn) => { seen.name = name; return fn({}); } });
const svcWith = (repoOver, seen) => createEmployees({ db: fakeDb(seen), repo: repoOver, perms: perms([]) });

test('create: 201 with the actor as audit name; taken, deleted and racing numbers give 409; bad input gives 400 and writes nothing', async () => {
  const seen = {};
  let existing = null; let inserted = null; let boom = null;
  const svc = svcWith({
    findAnyEmployee: async () => existing,
    insertEmployee: async (_c, v) => { if (boom) throw boom; inserted = v; return { ...v }; },
  }, seen);
  const r = await svc.create(user(5, 'user'), good);
  assert.deepStrictEqual([r.status, r.body.employee.empno, r.body.employee.lastname, inserted.gender], [201, '00015', 'Cruz', 'F']);
  assert.strictEqual(seen.name, 'u5@x.test');
  existing = { is_deleted: false };
  assert.match((await svc.create(user(5, 'user'), good)).body.errors.empno, /already exists/); // TC-EMP-19
  existing = { is_deleted: true };
  const d = await svc.create(user(5, 'user'), good);
  assert.deepStrictEqual([d.status, /deleted employee/.test(d.body.errors.empno)], [409, true]);
  existing = null; inserted = null; boom = Object.assign(new Error('dup'), { code: '23505' });
  assert.strictEqual((await svc.create(user(5, 'user'), good)).status, 409);
  boom = new Error('db down');
  await assert.rejects(() => svc.create(user(5, 'user'), good), /db down/);
  boom = null;
  const bad = await svc.create(user(5, 'user'), { ...good, gender: 'Z', lastname: '' });
  assert.deepStrictEqual([bad.status, Object.keys(bad.body.errors).sort(), inserted], [400, ['gender', 'lastname'], null]);
});

test('update: number comes from the address; deleted or missing employee gives 404; bad input gives 400', async () => {
  let args = null; let row = { empno: '00015', lastname: 'Cruz', firstname: 'Ana', gender: 'F', birthdate: '1990-01-02', hiredate: '2020-03-04', sepdate: '2024-01-01' };
  const svc = svcWith({ updateEmployee: async (_c, empno, v) => { args = [empno, v]; return row; } });
  const r = await svc.update(user(5, 'user'), '00015', { ...good, empno: '99999', sepdate: '2024-01-01' });
  assert.deepStrictEqual([r.status, args[0], args[1].empno, args[1].sepdate], [200, '00015', undefined, '2024-01-01']);
  row = null;
  assert.strictEqual((await svc.update(user(5, 'user'), '00015', good)).status, 404);
  assert.strictEqual((await svc.update(user(5, 'user'), "0001'; --", good)).status, 404);
  args = null;
  const bad = await svc.update(user(5, 'user'), '00015', { ...good, lastname: '' });
  assert.deepStrictEqual([bad.status, args], [400, null]);
});

test('repo: insert and update use parameters; update only touches live rows and never the number', async () => {
  const db = recorder([{ empno: '00015' }]);
  await repo.insertEmployee(db, { empno: '00015', lastname: 'Cruz', firstname: 'Ana', gender: 'F', birthdate: '1990-01-02', hiredate: '2020-03-04', sepdate: null });
  assert.deepStrictEqual(db.calls[0].params, ['00015', 'Cruz', 'Ana', 'F', '1990-01-02', '2020-03-04', null]);
  await repo.updateEmployee(db, '00015', { lastname: 'C', firstname: 'A', gender: 'M', birthdate: '1990-01-02', hiredate: '2020-03-04', sepdate: '2024-01-01' });
  assert.match(db.calls[1].sql, /WHERE empno = \$1 AND NOT is_deleted/);
  assert.doesNotMatch(db.calls[1].sql.split('WHERE')[0], /empno =/);
  assert.match(db.calls[1].sql, /to_char\(sepdate/);
});

// ================= S3-DEV-05: Delete and Restore =================
test('remove: soft deletes with the actor as audit name; separation date is never touched', async () => {
  const seen = {}; let sql = null;
  const row = { empno: '00015', lastname: 'Cruz', firstname: 'Ana', sepdate: null };
  const svc = svcWith({
    findEmployee: async () => row, countActiveChildren: async () => ({ history: 0, sales: 0 }),
    softDeleteEmployee: async () => ({ ...row, is_deleted: true }),
  }, seen);
  const r = await svc.remove(user(5, 'user'), '00015');
  assert.deepStrictEqual([r.status, r.body.employee.sepdate, seen.name], [200, null, 'u5@x.test']);
  const db = recorder([{ empno: '00015' }]);
  await repo.softDeleteEmployee(db, '00015');
  sql = db.calls[0].sql;
  assert.match(sql, /SET is_deleted = true WHERE empno = \$1 AND NOT is_deleted/);
  assert.doesNotMatch(sql, /sepdate\s*=/i);
});

test('remove: blocked by active job history or sales (clear message, nothing deleted); trigger error is also caught; missing is 404', async () => {
  let deleted = 0; let children = { history: 2, sales: 1 }; let boom = null;
  const svc = svcWith({
    findEmployee: async (_c, n) => (n === '00099' ? null : { empno: n, lastname: 'Cruz', firstname: 'Ana' }),
    countActiveChildren: async () => children,
    softDeleteEmployee: async () => { if (boom) throw boom; deleted += 1; return { empno: '00015' }; },
  });
  const r = await svc.remove(user(5, 'user'), '00015');
  assert.strictEqual(r.status, 409);
  assert.match(r.body.error, /Ana Cruz still has 2 job history records and 1 sales record/);
  children = { history: 1, sales: 0 };
  assert.match((await svc.remove(user(5, 'user'), '00015')).body.error, /1 job history record, so/);
  assert.strictEqual(deleted, 0);
  children = { history: 0, sales: 0 };
  boom = new Error('Cannot delete employee row: 1 active related record(s) still exist.');
  assert.match((await svc.remove(user(5, 'user'), '00015')).body.error, /cannot be deleted/); // a record appeared in between
  boom = new Error('db down');
  await assert.rejects(() => svc.remove(user(5, 'user'), '00015'), /db down/);
  assert.strictEqual((await svc.remove(user(5, 'user'), '00099')).status, 404);
  assert.strictEqual((await svc.remove(user(5, 'user'), "1'; DROP")).status, 404);
});

test('restore: Admin only; 404 when not deleted or unknown; 200 otherwise', async () => {
  let found = { empno: '00015', is_deleted: true };
  const svc = svcWith({ findAnyEmployee: async () => found, restoreEmployee: async (_c, n) => ({ empno: n, lastname: 'C', firstname: 'A' }) });
  assert.strictEqual((await svc.restore(user(5, 'user'), '00015')).status, 403);
  assert.strictEqual((await svc.restore(admin(), '00015')).status, 200);
  found = { empno: '00015', is_deleted: false };
  assert.strictEqual((await svc.restore(admin(), '00015')).status, 404);
  found = null;
  assert.strictEqual((await svc.restore(admin(), '00015')).status, 404);
  assert.strictEqual((await svc.restore(admin(), 'bad')).status, 404);
});

test('repo: children count looks only at active job history and sales; restore only touches deleted rows', async () => {
  const db = recorder([{ history: '2', sales: '3' }]);
  assert.deepStrictEqual(await repo.countActiveChildren(db, '00015'), { history: 2, sales: 3 });
  assert.match(db.calls[0].sql, /jobhistory_active/);
  assert.match(db.calls[0].sql, /sales_active/);
  await repo.restoreEmployee(recorder([{}]), '00015');
  const r = recorder([{}]);
  await repo.restoreEmployee(r, '00015');
  assert.match(r.calls[0].sql, /SET is_deleted = false WHERE empno = \$1 AND is_deleted/);
});
