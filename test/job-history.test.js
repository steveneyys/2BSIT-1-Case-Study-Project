'use strict';

const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/jobHistoryRepo');
const { createJobHistory, pickCurrent, VIEW_RIGHTS } = require('../src/services/jobHistory');
const { validateJobHistory, parseSalary } = require('../src/validators/jobHistory');
const { createPermissions } = require('../src/services/permissions');
const { requireRight } = require('../src/middleware/permissions');
const { guardPages } = require('../src/middleware/pageGuard');
const { buildMenu } = require('../src/services/menu');
const { createSessionToken } = require('../src/services/session');

const user = (id, role) => ({ user_id: id, first_name: 'F', last_name: 'L', email: `u${id}@x.test`, role, is_blocked: false, status: 'active' });
const admin = () => user(1, 'admin');
const perms = (rights) => createPermissions({ db: {}, repo: { listUserRights: async () => rights } });
const recorder = (rows = [], rowCount = 1) => { const calls = []; return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows, rowCount }; } }; };
const TODAY = '2026-11-24';
const good = { jobcode: 'pr2', deptcode: 'it', effdate: '2022-01-01', salary: '50000.5' };

// ---- validation ----
test('parseSalary: number, not negative, 2 decimals, max 99,999,999.99', () => {
  assert.strictEqual(parseSalary('50000.5').value, '50000.50');
  assert.strictEqual(parseSalary(' 0 ').value, '0.00');
  assert.strictEqual(parseSalary(48000).value, '48000.00');
  assert.strictEqual(parseSalary('99999999.99').value, '99999999.99');
  assert.match(parseSalary('').error, /Enter the salary/);
  assert.match(parseSalary('-1000').error, /negative/); // TC-JH-09
  for (const bad of ['abc', '1,000', '1e5', '12.', '.5', '1 000']) assert.match(parseSalary(bad).error, /number/, bad); // TC-JH-10
  assert.match(parseSalary('1.234').error, /2 decimal/);
  assert.match(parseSalary('100000000').error, /too large/); // TC-JH-11
});

test('validateJobHistory: required fields, uppercased codes, hire-date rule', () => {
  assert.deepStrictEqual(Object.keys(validateJobHistory({}).errors).sort(), ['deptcode', 'effdate', 'jobcode', 'salary']); // TC-JH-07, 08
  const ok = validateJobHistory(good, { hiredate: '2010-05-11' });
  assert.deepStrictEqual([ok.errors, ok.value], [{}, { jobcode: 'PR2', deptcode: 'IT', effdate: '2022-01-01', salary: '50000.50' }]);
  assert.match(validateJobHistory({ ...good, effdate: '2010-05-10' }, { hiredate: '2010-05-11' }).errors.effdate, /before the hire date/); // TC-JH-14
  assert.deepStrictEqual(validateJobHistory({ ...good, effdate: '2010-05-11' }, { hiredate: '2010-05-11' }).errors, {}); // on the hire date is fine
  assert.deepStrictEqual(validateJobHistory({ ...good, effdate: '2099-01-01' }, { hiredate: '2010-05-11' }).errors, {}); // future date, TC-JH-17
  assert.ok(validateJobHistory({ ...good, effdate: '2022-02-30' }).errors.effdate);
  assert.ok(validateJobHistory({ ...good, jobcode: 'A-1' }).errors.jobcode);
  assert.ok(validateJobHistory({ ...good, deptcode: 'ABCD' }).errors.deptcode);
});

// ---- current job ----
test('pickCurrent: latest started live row; future and deleted rows do not count; none gives null', () => {
  const rows = [
    { jobcode: 'A', effdate: '2030-01-01' }, { jobcode: 'B', effdate: '2022-01-01' },
    { jobcode: 'C', effdate: '2024-06-01', is_deleted: true }, { jobcode: 'D', effdate: '2010-01-01' },
  ];
  assert.strictEqual(pickCurrent(rows, TODAY).jobcode, 'B'); // TC-JH-02, 17, 22
  assert.strictEqual(pickCurrent([{ jobcode: 'D', effdate: '2010-01-01' }], TODAY).jobcode, 'D'); // TC-JH-16
  assert.strictEqual(pickCurrent([{ jobcode: 'C', effdate: '2024-06-01', is_deleted: true }], TODAY), null); // TC-JH-24
  assert.strictEqual(pickCurrent([], TODAY), null);
  assert.strictEqual(pickCurrent([{ jobcode: 'T', effdate: TODAY }], TODAY).jobcode, 'T'); // starts today = current today
});

// ---- view ----
const emp = { empno: '00001', lastname: 'Smith ', firstname: 'John', hiredate: '2010-05-11', sepdate: null, is_deleted: false };
const dbRows = [
  { empno: '00001', jobcode: 'MGR', jobdesc: 'Manager', deptcode: 'IT', deptname: 'Information Tech', effdate: '2012-01-01', salary: '70000.00', is_deleted: true, stamp: 'DELETE x' },
  { empno: '00001', jobcode: 'PR2', jobdesc: 'Programmer 2 ', deptcode: 'IT', deptname: 'Information Tech', effdate: '2010-12-01', salary: '50000.00', is_deleted: false, stamp: 'S1' },
  { empno: '00001', jobcode: 'PR1', jobdesc: 'Programmer 1', deptcode: 'IT', deptname: 'Information Tech', effdate: '2010-05-11', salary: '48000.00', is_deleted: false, stamp: 'S2' },
];
const viewSvc = (rights, over = {}) => createJobHistory({
  db: {}, today: () => TODAY, perms: perms(rights),
  repo: { findEmployee: async () => emp, listHistory: async (_d, _e, o) => (o.includeDeleted ? dbRows : dbRows.filter((r) => !r.is_deleted)), listOptions: async () => ({ jobs: [{ code: 'PR2' }], departments: [{ code: 'IT' }] }), ...over },
});

test('view: users get live rows only, no Status or Stamp; Admins get everything; current job is marked', async () => {
  const u = (await viewSvc(['JOBHIST_VIEW']).view(user(5, 'user'), '00001')).body;
  assert.strictEqual(u.history.length, 2);
  assert.deepStrictEqual(u.history[0], { jobcode: 'PR2', job: 'Programmer 2', deptcode: 'IT', department: 'Information Tech', effdate: '2010-12-01', salary: 50000, current: true });
  assert.strictEqual(u.history[1].current, false);
  assert.strictEqual(u.current.jobcode, 'PR2');
  assert.strictEqual(u.options, undefined); // view only: no form choices
  assert.deepStrictEqual(u.can, { add: false, edit: false, delete: false, restore: false, seeDeleted: false });
  assert.deepStrictEqual(u.employee, { empno: '00001', lastname: 'Smith', firstname: 'John', hiredate: '2010-05-11', sepdate: null, deleted: false });
  const a = (await viewSvc([]).view(admin(), '00001')).body;
  assert.strictEqual(a.history.length, 3);
  assert.deepStrictEqual([a.history[0].status, a.history[0].deleted, a.history[0].current], ['Inactive', true, false]); // newest first, deleted never current (TC-JH-22)
  assert.ok(a.options);
  assert.deepStrictEqual([a.can.add, a.can.restore, a.can.seeDeleted], [true, true, true]);
});

test('view: write rights give the form choices; unknown, bad or (for users) deleted employees give 404', async () => {
  assert.ok((await viewSvc(['JOBHIST_ADD']).view(user(5, 'user'), '00001')).body.options);
  assert.ok((await viewSvc(['JOBHIST_EDIT']).view(user(5, 'user'), '00001')).body.options);
  assert.strictEqual((await viewSvc([], { findEmployee: async () => null }).view(admin(), '00009')).status, 404);
  assert.strictEqual((await viewSvc([]).view(admin(), "1'; DROP")).status, 404);
  const gone = { findEmployee: async () => ({ ...emp, is_deleted: true }) };
  assert.strictEqual((await viewSvc(['JOBHIST_VIEW'], gone).view(user(5, 'user'), '00001')).status, 404);
  const a = (await viewSvc([], gone).view(admin(), '00001')).body;
  assert.deepStrictEqual([a.employee.deleted, a.can.add, a.can.edit, a.options], [true, false, false, undefined]); // deleted employee: read-only
});

// ---- add / edit ----
let auditSeen;
const fakeDb = () => ({ txAs: async (name, fn) => { auditSeen = name; return fn({}); } });
function writeSvc(over = {}) {
  const st = { inserted: null, updated: null };
  const r = {
    lockEmployee: async () => {}, findEmployee: async () => emp, findJob: async () => ({}), findDepartment: async () => ({}),
    findLiveEffdate: async () => null, findRow: async () => null,
    insertRow: async (_c, e, v) => { st.inserted = v; return { empno: e, ...v, jobdesc: 'P2', deptname: 'IT', salary: v.salary }; },
    updateRow: async (_c, e, _k, v) => { st.updated = v; return { empno: e, ...v, jobdesc: 'P2', deptname: 'IT' }; },
    ...over,
  };
  return { svc: createJobHistory({ db: fakeDb(), repo: r, perms: perms([]), today: () => TODAY }), st };
}

test('create: 201 with the actor as audit name; bad input, missing job or department, date before hire give 400 and write nothing', async () => {
  const { svc, st } = writeSvc();
  const r = await svc.create(user(5, 'user'), '00001', good);
  assert.deepStrictEqual([r.status, st.inserted, auditSeen], [201, { jobcode: 'PR2', deptcode: 'IT', effdate: '2022-01-01', salary: '50000.50' }, 'u5@x.test']);
  assert.strictEqual(r.body.record.salary, 50000.5);
  const b = writeSvc();
  const bad = await b.svc.create(user(5, 'user'), '00001', { ...good, salary: '-5', effdate: '2001-01-01' });
  assert.deepStrictEqual([bad.status, Object.keys(bad.body.errors).sort(), b.st.inserted], [400, ['effdate', 'salary'], null]);
  const nojob = await writeSvc({ findJob: async () => null }).svc.create(user(5, 'user'), '00001', good);
  assert.match(nojob.body.errors.jobcode, /does not exist or is deleted/);
  const nodept = await writeSvc({ findDepartment: async () => null }).svc.create(user(5, 'user'), '00001', good);
  assert.match(nodept.body.errors.deptcode, /does not exist or is deleted/);
});

test('create: same effective date is refused (also when a deleted row has the same job and date, and on a race); missing or deleted employee refused', async () => {
  const taken = await writeSvc({ findLiveEffdate: async () => ({ jobcode: 'PR1' }) }).svc.create(user(5, 'user'), '00001', good);
  assert.deepStrictEqual([taken.status, /already has a job history record/.test(taken.body.errors.effdate)], [409, true]); // TC-JH-12
  const ghost = await writeSvc({ findRow: async () => ({ is_deleted: true }) }).svc.create(user(5, 'user'), '00001', good);
  assert.match(ghost.body.errors.effdate, /deleted record/);
  const race = await writeSvc({ insertRow: async () => { throw Object.assign(new Error('dup'), { code: '23505' }); } }).svc.create(user(5, 'user'), '00001', good);
  assert.strictEqual(race.status, 409);
  await assert.rejects(() => writeSvc({ insertRow: async () => { throw new Error('db down'); } }).svc.create(user(5, 'user'), '00001', good), /db down/);
  assert.strictEqual((await writeSvc({ findEmployee: async () => null }).svc.create(user(5, 'user'), '00001', good)).status, 404);
  assert.strictEqual((await writeSvc({ findEmployee: async () => ({ ...emp, is_deleted: true }) }).svc.create(user(5, 'user'), '00001', good)).status, 409);
  assert.strictEqual((await writeSvc().svc.create(user(5, 'user'), 'abc', good)).status, 404);
});

test('create: the same job again on a different date is fine (TC-JH-13)', async () => {
  let seenKey = null;
  const { svc } = writeSvc({ findRow: async (_c, _e, job, eff) => { seenKey = [job, eff]; return null; } });
  assert.strictEqual((await svc.create(user(5, 'user'), '00001', { ...good, jobcode: 'PR1' })).status, 201);
  assert.deepStrictEqual(seenKey, ['PR1', '2022-01-01']);
});

test('update: row is found by its key; job, department, date and salary can change; own date is not a clash; deleted or missing row gives 404', async () => {
  let exceptSeen = null;
  const live = { is_deleted: false };
  const { svc, st } = writeSvc({ findRow: async (_c, _e, job, eff) => (job === 'PR2' && eff === '2022-01-01' ? live : null), findLiveEffdate: async (_c, _e, _d, except) => { exceptSeen = except; return null; } });
  const r = await svc.update(user(5, 'user'), '00001', 'PR2', '2022-01-01', { ...good, jobcode: 'MGR', salary: '60000' });
  assert.deepStrictEqual([r.status, st.updated.jobcode, st.updated.salary, exceptSeen], [200, 'MGR', '60000.00', { jobcode: 'PR2', effdate: '2022-01-01' }]); // TC-JH-18, 20
  assert.strictEqual((await svc.update(user(5, 'user'), '00001', 'ZZ9', '2022-01-01', good)).status, 404);
  const del = writeSvc({ findRow: async () => ({ is_deleted: true }) });
  assert.strictEqual((await del.svc.update(user(5, 'user'), '00001', 'PR2', '2022-01-01', good)).status, 404);
  assert.strictEqual((await svc.update(user(5, 'user'), '00001', "PR2'; --", '2022-01-01', good)).status, 404);
  assert.strictEqual((await svc.update(user(5, 'user'), '00001', 'PR2', 'not-a-date', good)).status, 404);
});

test('update: changing the date to one the employee already has is refused and nothing is saved (TC-JH-19)', async () => {
  const w = writeSvc({ findRow: async (_c, _e, job, eff) => (job === 'PR2' && eff === '2022-01-01' ? { is_deleted: false } : null), findLiveEffdate: async () => ({ jobcode: 'PR1' }) });
  const r = await w.svc.update(user(5, 'user'), '00001', 'PR2', '2022-01-01', { ...good, effdate: '2010-05-11' });
  assert.deepStrictEqual([r.status, w.st.updated], [409, null]);
  const move = writeSvc({ findRow: async (_c, _e, job, eff) => (eff === '2022-01-01' ? { is_deleted: false } : { is_deleted: true }) });
  assert.match((await move.svc.update(user(5, 'user'), '00001', 'PR2', '2022-01-01', { ...good, effdate: '2023-01-01' })).body.errors.effdate, /deleted record/);
});

// ---- delete / restore ----
test('remove: soft delete; missing row gives 404; restore is Admin only, refuses a date clash, and explains deleted parents', async () => {
  const seen = [];
  const r = {
    lockEmployee: async () => {},
    softDeleteRow: async (_c, e, k) => (k.jobcode === 'PR2' ? { empno: e, ...k, salary: '1' } : null),
    findRow: async () => ({ is_deleted: true }), findLiveEffdate: async () => null,
    restoreRow: async (_c, e, k) => { seen.push(k); return { empno: e, ...k, salary: '1' }; },
  };
  const svc = createJobHistory({ db: fakeDb(), repo: r, perms: perms([]), today: () => TODAY });
  assert.strictEqual((await svc.remove(user(5, 'user'), '00001', 'PR2', '2022-01-01')).status, 200);
  assert.strictEqual((await svc.remove(user(5, 'user'), '00001', 'ZZ9', '2022-01-01')).status, 404);
  assert.strictEqual((await svc.remove(user(5, 'user'), '00001', 'PR2', 'x')).status, 404);
  assert.strictEqual((await svc.restore(user(5, 'user'), '00001', 'PR2', '2022-01-01')).status, 403);
  assert.strictEqual((await svc.restore(admin(), '00001', 'PR2', '2022-01-01')).status, 200);
  assert.deepStrictEqual(seen, [{ jobcode: 'PR2', effdate: '2022-01-01' }]);
  const clash = createJobHistory({ db: fakeDb(), repo: { ...r, findLiveEffdate: async () => ({}) }, perms: perms([]), today: () => TODAY });
  assert.strictEqual((await clash.restore(admin(), '00001', 'PR2', '2022-01-01')).status, 409);
  const notDeleted = createJobHistory({ db: fakeDb(), repo: { ...r, findRow: async () => ({ is_deleted: false }) }, perms: perms([]), today: () => TODAY });
  assert.strictEqual((await notDeleted.restore(admin(), '00001', 'PR2', '2022-01-01')).status, 404);
  const parent = createJobHistory({ db: fakeDb(), repo: { ...r, restoreRow: async () => { throw new Error('Cannot save jobhistory record: job PR2 is deleted. Restore it first.'); } }, perms: perms([]), today: () => TODAY });
  assert.match((await parent.restore(admin(), '00001', 'PR2', '2022-01-01')).body.error, /Restore that first/);
});

// ---- repo ----
test('repo: queries use parameters; users never get deleted rows; salary read as text; update only touches live rows', async () => {
  const db = recorder([]);
  await repo.listHistory(db, '00001');
  assert.match(db.calls[0].sql, /AND NOT h\.is_deleted/);
  assert.match(db.calls[0].sql, /ORDER BY h\.effdate DESC/);
  assert.match(db.calls[0].sql, /h\.salary::text/);
  assert.deepStrictEqual(db.calls[0].params, ['00001']);
  await repo.listHistory(db, '00001', { includeDeleted: true });
  assert.doesNotMatch(db.calls[1].sql, /NOT h\.is_deleted/);
  const u = recorder([{}], 1);
  await repo.updateRow(u, '00001', { jobcode: 'PR2', effdate: '2022-01-01' }, { jobcode: 'MGR', effdate: '2022-02-02', salary: '1.00', deptcode: 'IT' });
  assert.match(u.calls[0].sql, /AND NOT is_deleted/);
  assert.deepStrictEqual(u.calls[0].params, ['00001', 'PR2', '2022-01-01', 'MGR', '2022-02-02', '1.00', 'IT']);
  const none = recorder([], 0);
  assert.strictEqual(await repo.updateRow(none, '00001', { jobcode: 'X1', effdate: '2022-01-01' }, { jobcode: 'X1', effdate: '2022-01-01', salary: '1', deptcode: 'IT' }), null);
  const l = recorder([{}]);
  await repo.findLiveEffdate(l, '00001', '2022-01-01', { jobcode: 'PR2', effdate: '2022-01-01' });
  assert.match(l.calls[0].sql, /jobhistory_active/);
});

// ---- access ----
const res = () => { const r = { code: 200, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; }, redirect(c, to) { r.code = c; r.to = to; return r; }, set() { return r; } }; return r; };
const go = (mw, req) => new Promise((resolve) => { const r = res(); mw(req, r, () => resolve('next')); setImmediate(() => resolve(r.code)); });

test('API gate: any job history right opens the router; rights from other modules do not', async () => {
  const mw = (rights) => requireRight(perms(rights), ...VIEW_RIGHTS);
  assert.strictEqual(await go(mw([]), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(mw(['EMP_ADD', 'EMP_EDIT', 'JOB_ADD']), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(mw(['JOBHIST_ADD']), { user: user(5, 'user') }), 'next');
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

test('page: needs the View Job History right (a write right alone is not enough); Admins always open it', async () => {
  assert.strictEqual((await page('user', [], '/job-history.html', false)).redirect, '/login.html');
  assert.strictEqual((await page('user', ['EMP_EDIT', 'JOBHIST_ADD'], '/job-history.html')).redirect, '/home.html');
  assert.strictEqual((await page('user', ['JOBHIST_VIEW'], '/job-history.html')).next, true);
  assert.strictEqual((await page('user', ['JOBHIST_VIEW'], '/JOB-HISTORY.html')).next, true);
  assert.strictEqual((await page('user', ['EMP_ADD'], '/%6Aob-history.html')).redirect, '/home.html');
  assert.strictEqual((await page('admin', [], '/job-history.html')).next, true);
});

test('menu: the job history screen keeps the Human Resources tab lit but is not a landing page', () => {
  const hr = [{ module_code: 'HR', module_name: 'Human Resources' }];
  const m = buildMenu(user(5, 'user'), hr, ['HR'], { all: false, codes: new Set(['JOBHIST_VIEW']) });
  assert.ok(m.modules[0].pages.includes('/job-history.html'));
  assert.notStrictEqual(m.modules[0].href, '/job-history.html');
});
