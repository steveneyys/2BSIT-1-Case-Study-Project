'use strict';

const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/departmentRepo');
const { createDepartments, normalizeQuery, VIEW_RIGHTS } = require('../src/services/departments');
const { validateDepartment } = require('../src/validators/department');
const { createPermissions } = require('../src/services/permissions');
const { requireRight } = require('../src/middleware/permissions');
const { guardPages } = require('../src/middleware/pageGuard');
const { buildMenu, MODULE_PAGES } = require('../src/services/menu');
const { createSessionToken } = require('../src/services/session');

const user = (id, role) => ({ user_id: id, first_name: 'F', last_name: 'L', email: `u${id}@x.test`, role, is_blocked: false, status: 'active' });
const admin = () => user(1, 'admin');
const perms = (rights) => createPermissions({ db: {}, repo: { listUserRights: async () => rights } });
const recorder = (rows = []) => { const calls = []; return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows }; } }; };
let auditSeen;
const fakeDb = () => ({ txAs: async (name, fn) => { auditSeen = name; return fn({}); } });

// ---- validation ----
test('validateDepartment: code 2-3 letters or digits, uppercased; name required, 20 max', () => {
  assert.deepStrictEqual(Object.keys(validateDepartment({}, { needCode: true }).errors).sort(), ['code', 'name']);
  for (const bad of ['A', 'ABCD', 'A-B', 'A B', 'é1']) assert.ok(validateDepartment({ code: bad, name: 'x' }, { needCode: true }).errors.code, bad);
  assert.ok(validateDepartment({ code: 'HRD', name: 'x'.repeat(21) }, { needCode: true }).errors.name);
  assert.ok(validateDepartment({ code: 'HRD', name: '   ' }, { needCode: true }).errors.name);
  const ok = validateDepartment({ code: ' it ', name: ' Information Tech ' }, { needCode: true });
  assert.deepStrictEqual([ok.errors, ok.value], [{}, { code: 'IT', name: 'Information Tech' }]);
  assert.deepStrictEqual(validateDepartment({ code: 'ZZZ', name: 'x' }).value, { name: 'x' }); // edit ignores any code in the body
});

test('normalizeQuery: defaults, trimming, hostile values fall back', () => {
  assert.deepStrictEqual(normalizeQuery({}), { search: '', status: 'active', sort: 'code', dir: 'asc', pageSize: 25, page: 1 });
  const n = normalizeQuery({ search: 'x'.repeat(400), sort: 'code; DROP', dir: 'up', status: 'x', pageSize: '9999', page: '-1' });
  assert.deepStrictEqual([n.search.length, n.sort, n.dir, n.status, n.pageSize, n.page], [100, 'code', 'asc', 'active', 25, 1]);
});

// ---- list ----
test('list: only Admins can see deleted departments; Status and Stamp are Admin-only', async () => {
  const seen = [];
  const rows = [{ deptcode: 'ACT', deptname: 'Accounting ', is_deleted: true, stamp: 'DELETE ana 2026-11-24', total: '1' }];
  const r = { listDepartments: async (_d, a) => { seen.push(a.scope); return rows; }, countDepartments: async () => ({ active: 7, deleted: 1, all: 8 }) };
  const svc = createDepartments({ db: {}, repo: r, perms: perms(['DEPT_DELETE']) });
  const u = await svc.list(user(5, 'user'), { status: 'deleted' });
  const a = await svc.list(admin(), { status: 'deleted' });
  assert.deepStrictEqual(seen, ['active', 'deleted']);
  assert.strictEqual(u.body.counts, undefined);
  assert.deepStrictEqual(a.body.counts, { active: 7, deleted: 1, all: 8 });
  assert.deepStrictEqual(u.body.departments[0], { code: 'ACT', name: 'Accounting' });
  assert.deepStrictEqual([a.body.departments[0].status, a.body.departments[0].stamp], ['Inactive', 'DELETE ana 2026-11-24']);
  assert.deepStrictEqual(u.body.can, { add: false, edit: false, delete: true, restore: false, seeDeleted: false });
  assert.deepStrictEqual([a.body.can.restore, a.body.can.seeDeleted], [true, true]);
});

test('list: paging numbers', async () => {
  const rows = [{ deptcode: 'ACT', deptname: 'A', total: '55' }];
  const svc = createDepartments({ db: {}, repo: { listDepartments: async () => rows, countDepartments: async () => ({}) }, perms: perms([]) });
  const b = (await svc.list(user(5, 'user'), { pageSize: '25', page: '2' })).body;
  assert.deepStrictEqual([b.total, b.page, b.pages], [55, 2, 3]);
});

// ---- create ----
const mkSvc = (over) => createDepartments({ db: fakeDb(), repo: over, perms: perms([]) });

test('create: 201, audit name is the actor; taken / deleted code and duplicate name give 409; bad input 400', async () => {
  let existing = null, nameTaken = null, inserted = null;
  const svc = mkSvc({
    lockNames: async () => {}, findAnyDepartment: async () => existing, findNameTaken: async () => nameTaken,
    insertDepartment: async (_c, v) => { inserted = v; return { deptcode: v.code, deptname: v.name }; },
  });
  const body = { code: 'hrd', name: 'Human Resource' };
  const r = await svc.create(user(5, 'user'), body);
  assert.deepStrictEqual([r.status, r.body.department, inserted], [201, { code: 'HRD', name: 'Human Resource' }, { code: 'HRD', name: 'Human Resource' }]);
  assert.strictEqual(auditSeen, 'u5@x.test');
  existing = { is_deleted: false };
  assert.match((await svc.create(user(5, 'user'), body)).body.errors.code, /already in use/);
  existing = { is_deleted: true };
  const d = await svc.create(user(5, 'user'), body);
  assert.strictEqual(d.status, 409);
  assert.match(d.body.errors.code, /deleted department/);
  existing = null;
  nameTaken = { deptcode: 'XYZ' };
  assert.match((await svc.create(user(5, 'user'), body)).body.errors.name, /already has that name/);
  assert.strictEqual((await svc.create(user(5, 'user'), {})).status, 400);
});

test('create: a simultaneous add of the same code (23505) becomes 409', async () => {
  const svc = mkSvc({ lockNames: async () => {}, findAnyDepartment: async () => null, findNameTaken: async () => null, insertDepartment: async () => { throw Object.assign(new Error('dup'), { code: '23505' }); } });
  assert.strictEqual((await svc.create(user(5, 'user'), { code: 'HRD', name: 'x' })).status, 409);
});

// ---- update ----
test('update: 404 for bad/missing/deleted code, 409 for a name in use, 200 otherwise; the code in the body is ignored', async () => {
  let args, clash = null;
  const svc = mkSvc({
    lockNames: async () => {},
    findNameTaken: async () => clash,
    updateDepartment: async (_c, code, v) => { args = [code, v]; return code === 'HRD' ? { deptcode: code, deptname: v.name } : null; },
  });
  const u = user(5, 'user');
  assert.strictEqual((await svc.update(u, 'bad!', { name: 'x' })).status, 404);
  assert.strictEqual((await svc.update(u, 'ZZZ', { name: 'x' })).status, 404);
  const r = await svc.update(u, 'HRD', { code: 'XXX', name: ' People ' });
  assert.deepStrictEqual([r.status, args], [200, ['HRD', { name: 'People' }]]);
  assert.strictEqual((await svc.update(u, 'HRD', { name: '' })).status, 400);
  clash = { deptcode: 'OTH' };
  assert.strictEqual((await svc.update(u, 'HRD', { name: 'Payroll' })).status, 409);
});

// ---- delete / restore ----
test('remove: blocked with a friendly 409 while job history uses it; nothing is deleted', async () => {
  let deleted = false;
  const svc = mkSvc({
    findDepartment: async () => ({ deptcode: 'IT', deptname: 'Information Tech' }),
    countActiveJobHistory: async () => 4,
    softDeleteDepartment: async () => { deleted = true; return {}; },
  });
  const r = await svc.remove(user(5, 'user'), 'IT');
  assert.strictEqual(r.status, 409);
  assert.match(r.body.error, /Information Tech is used in 4 job history records/);
  assert.strictEqual(deleted, false);
});

test('remove: 200 when clear; 404 for bad, missing or already deleted; the database trigger is the last guard', async () => {
  let trigger = false;
  const svc = mkSvc({
    findDepartment: async (_c, code) => (code === 'HRD' ? { deptcode: code, deptname: 'HR' } : null),
    countActiveJobHistory: async () => 0,
    softDeleteDepartment: async (_c, code) => { if (trigger) throw new Error('Cannot delete department row: 1 active related record(s) still exist.'); return { deptcode: code, deptname: 'HR' }; },
  });
  const u = user(5, 'user');
  assert.strictEqual((await svc.remove(u, 'HRD')).status, 200);
  assert.strictEqual(auditSeen, 'u5@x.test');
  assert.strictEqual((await svc.remove(u, 'ZZZ')).status, 404);
  assert.strictEqual((await svc.remove(u, 'x')).status, 404);
  trigger = true;
  assert.strictEqual((await svc.remove(u, 'HRD')).status, 409);
});

test('restore: Admin only; 404 when not deleted; 409 if its name is now used by another live department', async () => {
  let clash = null;
  const svc = mkSvc({
    lockNames: async () => {},
    findAnyDepartment: async (_c, code) => (code === 'HRD' ? { deptcode: code, deptname: 'HR', is_deleted: true } : { deptcode: code, deptname: 'X', is_deleted: false }),
    findNameTaken: async () => clash,
    restoreDepartment: async (_c, code) => ({ deptcode: code, deptname: 'HR' }),
  });
  assert.strictEqual((await svc.restore(user(5, 'user'), 'HRD')).status, 403);
  assert.strictEqual((await svc.restore(admin(), 'HRD')).status, 200);
  assert.strictEqual((await svc.restore(admin(), 'ACT')).status, 404); // not deleted
  assert.strictEqual((await svc.restore(admin(), 'bad!')).status, 404);
  clash = { deptcode: 'OTH' };
  assert.strictEqual((await svc.restore(admin(), 'HRD')).status, 409);
});

// ---- SQL ----
test('SQL: active view, parameterized, LIKE escaped, fixed sort text, scope all uses the table', async () => {
  const db = recorder([]);
  await repo.listDepartments(db, { search: '50%_', sort: 'name; DROP TABLE department', dir: 'desc', limit: 25, offset: 0 });
  assert.match(db.calls[0].sql, /FROM department_active/);
  assert.match(db.calls[0].sql, /ORDER BY deptcode DESC, deptcode ASC/); // unknown sort falls back to code
  assert.deepStrictEqual(db.calls[0].params, ['%50\\%\\_%', 25, 0]);
  const l = recorder();
  await repo.listDepartments(l, { scope: 'all', limit: 10, offset: 0 });
  await repo.listDepartments(l, { scope: 'deleted', limit: 10, offset: 0 });
  await repo.listDepartments(l, { scope: 'bogus', limit: 10, offset: 0 });
  assert.match(l.calls[0].sql, /FROM department\s/);
  assert.match(l.calls[1].sql, /AND is_deleted/);
  assert.match(l.calls[2].sql, /FROM department_active/);
});

test('SQL: edits touch live rows only; delete and restore are soft; job history count ignores deleted rows', async () => {
  const db = recorder([{ deptcode: 'HRD', n: '0' }]);
  await repo.updateDepartment(db, 'HRD', { name: 'x' });
  await repo.softDeleteDepartment(db, 'HRD');
  await repo.restoreDepartment(db, 'HRD');
  await repo.countActiveJobHistory(db, 'HRD');
  await repo.insertDepartment(db, { code: 'HRD', name: 'x' });
  assert.match(db.calls[0].sql, /SET deptname = \$2 WHERE deptcode = \$1 AND NOT is_deleted/);
  assert.match(db.calls[1].sql, /SET is_deleted = true WHERE deptcode = \$1 AND NOT is_deleted/);
  assert.match(db.calls[2].sql, /SET is_deleted = false WHERE deptcode = \$1 AND is_deleted/);
  assert.match(db.calls[3].sql, /FROM jobhistory_active WHERE deptcode = \$1/);
  assert.deepStrictEqual(db.calls[4].params, ['HRD', 'x']);
  assert.ok(!db.calls.some((c) => /DELETE FROM/i.test(c.sql)));
});

// ---- gate: API and page ----
const res = () => { const r = { code: 200, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; }, redirect(c, to) { r.code = c; r.to = to; return r; }, set() { return r; } }; return r; };
const go = (mw, req) => new Promise((resolve) => { const r = res(); mw(req, r, () => resolve('next')); setImmediate(() => resolve(r.code)); });

test('API gate: signed-in users need at least one department right; rights from other modules do not count', async () => {
  const mw = (rights) => requireRight(perms(rights), ...VIEW_RIGHTS);
  assert.strictEqual(await go(mw([]), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(mw(['CUST_ADD', 'JOB_ADD', 'EMP_ADD']), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(mw(['DEPT_EDIT']), { user: user(5, 'user') }), 'next');
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

test('page: signed out -> login; no department right -> home; any department right, or admin -> opens (odd spellings too)', async () => {
  assert.strictEqual((await page('user', [], '/departments.html', false)).redirect, '/login.html');
  assert.strictEqual((await page('user', ['CUST_ADD', 'JOB_ADD'], '/departments.html')).redirect, '/home.html');
  assert.strictEqual((await page('user', ['DEPT_ADD'], '/departments.html')).next, true);
  assert.strictEqual((await page('user', ['DEPT_DELETE'], '/DEPARTMENTS.html')).next, true);
  assert.strictEqual((await page('user', ['DEPT_EDIT'], '//departments.html')).next, true);
  assert.strictEqual((await page('user', ['CUST_ADD'], '/%64epartments.html')).redirect, '/home.html');
  assert.strictEqual((await page('admin', [], '/departments.html')).next, true);
});

test('menu: HR opens on Departments; other modules keep their pages', () => {
  assert.strictEqual(MODULE_PAGES.hr, '/departments.html');
  const m = buildMenu(user(5, 'user'), [{ module_code: 'HR', module_name: 'Human Resources' }], ['HR']);
  assert.strictEqual(m.modules[0].href, '/departments.html');
});
