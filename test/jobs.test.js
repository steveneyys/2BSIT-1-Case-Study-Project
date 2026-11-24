'use strict';

const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/jobRepo');
const { createJobs, normalizeQuery, VIEW_RIGHTS } = require('../src/services/jobs');
const { validateJob } = require('../src/validators/job');
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
const fakeDb = () => ({ txAs: async (description, fn) => { auditSeen = description; return fn({}); } });

// ---- validation ----
test('validateJob: code 2-3 letters or digits, uppercased; description required, 20 max', () => {
  assert.deepStrictEqual(Object.keys(validateJob({}, { needCode: true }).errors).sort(), ['code', 'description']);
  for (const bad of ['A', 'ABCDE', 'A-B', 'A B', 'é1']) assert.ok(validateJob({ code: bad, description: 'x' }, { needCode: true }).errors.code, bad);
  assert.ok(validateJob({ code: 'PR2', description: 'x'.repeat(21) }, { needCode: true }).errors.description);
  assert.ok(validateJob({ code: 'PR2', description: '   ' }, { needCode: true }).errors.description);
  const ok = validateJob({ code: ' pr1 ', description: ' Programmer 1 ' }, { needCode: true });
  assert.deepStrictEqual([ok.errors, ok.value], [{}, { code: 'PR1', description: 'Programmer 1' }]);
  assert.deepStrictEqual(validateJob({ code: 'ZZZZ', description: 'x' }).value, { description: 'x' }); // edit ignores any code in the body
});

test('normalizeQuery: defaults, trimming, hostile values fall back', () => {
  assert.deepStrictEqual(normalizeQuery({}), { search: '', status: 'active', sort: 'code', dir: 'asc', pageSize: 25, page: 1 });
  const n = normalizeQuery({ search: 'x'.repeat(400), sort: 'code; DROP', dir: 'up', status: 'x', pageSize: '9999', page: '-1' });
  assert.deepStrictEqual([n.search.length, n.sort, n.dir, n.status, n.pageSize, n.page], [100, 'code', 'asc', 'active', 25, 1]);
});

// ---- list ----
test('list: only Admins can see deleted jobs; Status and Stamp are Admin-only', async () => {
  const seen = [];
  const rows = [{ jobcode: 'MGR', jobdesc: 'Manager ', is_deleted: true, stamp: 'DELETE ana 2026-11-24', total: '1' }];
  const r = { listJobs: async (_d, a) => { seen.push(a.scope); return rows; }, countJobs: async () => ({ active: 7, deleted: 1, all: 8 }) };
  const svc = createJobs({ db: {}, repo: r, perms: perms(['JOB_DELETE']) });
  const u = await svc.list(user(5, 'user'), { status: 'deleted' });
  const a = await svc.list(admin(), { status: 'deleted' });
  assert.deepStrictEqual(seen, ['active', 'deleted']);
  assert.strictEqual(u.body.counts, undefined);
  assert.deepStrictEqual(a.body.counts, { active: 7, deleted: 1, all: 8 });
  assert.deepStrictEqual(u.body.jobs[0], { code: 'MGR', description: 'Manager' });
  assert.deepStrictEqual([a.body.jobs[0].status, a.body.jobs[0].stamp], ['Inactive', 'DELETE ana 2026-11-24']);
  assert.deepStrictEqual(u.body.can, { add: false, edit: false, delete: true, restore: false, seeDeleted: false });
  assert.deepStrictEqual([a.body.can.restore, a.body.can.seeDeleted], [true, true]);
});

test('list: paging numbers', async () => {
  const rows = [{ jobcode: 'MGR', jobdesc: 'A', total: '55' }];
  const svc = createJobs({ db: {}, repo: { listJobs: async () => rows, countJobs: async () => ({}) }, perms: perms([]) });
  const b = (await svc.list(user(5, 'user'), { pageSize: '25', page: '2' })).body;
  assert.deepStrictEqual([b.total, b.page, b.pages], [55, 2, 3]);
});

// ---- create ----
const mkSvc = (over) => createJobs({ db: fakeDb(), repo: over, perms: perms([]) });

test('create: 201, audit description is the actor; taken / deleted code and duplicate description give 409; bad input 400', async () => {
  let existing = null, nameTaken = null, inserted = null;
  const svc = mkSvc({
    lockNames: async () => {}, findAnyJob: async () => existing, findNameTaken: async () => nameTaken,
    insertJob: async (_c, v) => { inserted = v; return { jobcode: v.code, jobdesc: v.description }; },
  });
  const body = { code: 'pr2', description: 'Programmer 2' };
  const r = await svc.create(user(5, 'user'), body);
  assert.deepStrictEqual([r.status, r.body.job, inserted], [201, { code: 'PR2', description: 'Programmer 2' }, { code: 'PR2', description: 'Programmer 2' }]);
  assert.strictEqual(auditSeen, 'u5@x.test');
  existing = { is_deleted: false };
  assert.match((await svc.create(user(5, 'user'), body)).body.errors.code, /already in use/);
  existing = { is_deleted: true };
  const d = await svc.create(user(5, 'user'), body);
  assert.strictEqual(d.status, 409);
  assert.match(d.body.errors.code, /deleted job/);
  existing = null;
  nameTaken = { jobcode: 'XYZ' };
  assert.match((await svc.create(user(5, 'user'), body)).body.errors.description, /already has that description/);
  assert.strictEqual((await svc.create(user(5, 'user'), {})).status, 400);
});

test('create: a simultaneous add of the same code (23505) becomes 409', async () => {
  const svc = mkSvc({ lockNames: async () => {}, findAnyJob: async () => null, findNameTaken: async () => null, insertJob: async () => { throw Object.assign(new Error('dup'), { code: '23505' }); } });
  assert.strictEqual((await svc.create(user(5, 'user'), { code: 'PR2', description: 'x' })).status, 409);
});

// ---- update ----
test('update: 404 for bad/missing/deleted code, 409 for a description in use, 200 otherwise; the code in the body is ignored', async () => {
  let args, clash = null;
  const svc = mkSvc({
    lockNames: async () => {},
    findNameTaken: async () => clash,
    updateJob: async (_c, code, v) => { args = [code, v]; return code === 'PR2' ? { jobcode: code, jobdesc: v.description } : null; },
  });
  const u = user(5, 'user');
  assert.strictEqual((await svc.update(u, 'bad!', { description: 'x' })).status, 404);
  assert.strictEqual((await svc.update(u, 'ZZZZ', { description: 'x' })).status, 404);
  const r = await svc.update(u, 'PR2', { code: 'XXXX', description: ' People ' });
  assert.deepStrictEqual([r.status, args], [200, ['PR2', { description: 'People' }]]);
  assert.strictEqual((await svc.update(u, 'PR2', { description: '' })).status, 400);
  clash = { jobcode: 'OTHR' };
  assert.strictEqual((await svc.update(u, 'PR2', { description: 'Payroll' })).status, 409);
});

// ---- delete / restore ----
test('remove: blocked with a friendly 409 while job history uses it; nothing is deleted', async () => {
  let deleted = false;
  const svc = mkSvc({
    findJob: async () => ({ jobcode: 'PR1', jobdesc: 'Programmer 1' }),
    countActiveJobHistory: async () => 4,
    softDeleteJob: async () => { deleted = true; return {}; },
  });
  const r = await svc.remove(user(5, 'user'), 'PR1');
  assert.strictEqual(r.status, 409);
  assert.match(r.body.error, /Programmer 1 is used in 4 job history records/);
  assert.strictEqual(deleted, false);
});

test('remove: 200 when clear; 404 for bad, missing or already deleted; the database trigger is the last guard', async () => {
  let trigger = false;
  const svc = mkSvc({
    findJob: async (_c, code) => (code === 'PR2' ? { jobcode: code, jobdesc: 'HR' } : null),
    countActiveJobHistory: async () => 0,
    softDeleteJob: async (_c, code) => { if (trigger) throw new Error('Cannot delete job row: 1 active related record(s) still exist.'); return { jobcode: code, jobdesc: 'HR' }; },
  });
  const u = user(5, 'user');
  assert.strictEqual((await svc.remove(u, 'PR2')).status, 200);
  assert.strictEqual(auditSeen, 'u5@x.test');
  assert.strictEqual((await svc.remove(u, 'ZZZZ')).status, 404);
  assert.strictEqual((await svc.remove(u, 'x')).status, 404);
  trigger = true;
  assert.strictEqual((await svc.remove(u, 'PR2')).status, 409);
});

test('restore: Admin only; 404 when not deleted; 409 if its description is now used by another live job', async () => {
  let clash = null;
  const svc = mkSvc({
    lockNames: async () => {},
    findAnyJob: async (_c, code) => (code === 'PR2' ? { jobcode: code, jobdesc: 'HR', is_deleted: true } : { jobcode: code, jobdesc: 'X', is_deleted: false }),
    findNameTaken: async () => clash,
    restoreJob: async (_c, code) => ({ jobcode: code, jobdesc: 'HR' }),
  });
  assert.strictEqual((await svc.restore(user(5, 'user'), 'PR2')).status, 403);
  assert.strictEqual((await svc.restore(admin(), 'PR2')).status, 200);
  assert.strictEqual((await svc.restore(admin(), 'MGR')).status, 404); // not deleted
  assert.strictEqual((await svc.restore(admin(), 'bad!')).status, 404);
  clash = { jobcode: 'OTHR' };
  assert.strictEqual((await svc.restore(admin(), 'PR2')).status, 409);
});

// ---- SQL ----
test('SQL: active view, parameterized, LIKE escaped, fixed sort text, scope all uses the table', async () => {
  const db = recorder([]);
  await repo.listJobs(db, { search: '50%_', sort: 'description; DROP TABLE job', dir: 'desc', limit: 25, offset: 0 });
  assert.match(db.calls[0].sql, /FROM job_active/);
  assert.match(db.calls[0].sql, /ORDER BY jobcode DESC, jobcode ASC/); // unknown sort falls back to code
  assert.deepStrictEqual(db.calls[0].params, ['%50\\%\\_%', 25, 0]);
  const l = recorder();
  await repo.listJobs(l, { scope: 'all', limit: 10, offset: 0 });
  await repo.listJobs(l, { scope: 'deleted', limit: 10, offset: 0 });
  await repo.listJobs(l, { scope: 'bogus', limit: 10, offset: 0 });
  assert.match(l.calls[0].sql, /FROM job\s/);
  assert.match(l.calls[1].sql, /AND is_deleted/);
  assert.match(l.calls[2].sql, /FROM job_active/);
});

test('SQL: edits touch live rows only; delete and restore are soft; job history count ignores deleted rows', async () => {
  const db = recorder([{ jobcode: 'PR2', n: '0' }]);
  await repo.updateJob(db, 'PR2', { description: 'x' });
  await repo.softDeleteJob(db, 'PR2');
  await repo.restoreJob(db, 'PR2');
  await repo.countActiveJobHistory(db, 'PR2');
  await repo.insertJob(db, { code: 'PR2', description: 'x' });
  assert.match(db.calls[0].sql, /SET jobdesc = \$2 WHERE jobcode = \$1 AND NOT is_deleted/);
  assert.match(db.calls[1].sql, /SET is_deleted = true WHERE jobcode = \$1 AND NOT is_deleted/);
  assert.match(db.calls[2].sql, /SET is_deleted = false WHERE jobcode = \$1 AND is_deleted/);
  assert.match(db.calls[3].sql, /FROM jobhistory_active WHERE jobcode = \$1/);
  assert.deepStrictEqual(db.calls[4].params, ['PR2', 'x']);
  assert.ok(!db.calls.some((c) => /DELETE FROM/i.test(c.sql)));
});

// ---- gate: API and page ----
const res = () => { const r = { code: 200, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; }, redirect(c, to) { r.code = c; r.to = to; return r; }, set() { return r; } }; return r; };
const go = (mw, req) => new Promise((resolve) => { const r = res(); mw(req, r, () => resolve('next')); setImmediate(() => resolve(r.code)); });

test('API gate: signed-in users need at least one job right; rights from other modules do not count', async () => {
  const mw = (rights) => requireRight(perms(rights), ...VIEW_RIGHTS);
  assert.strictEqual(await go(mw([]), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(mw(['CUST_ADD', 'DEPT_ADD', 'EMP_ADD']), { user: user(5, 'user') }), 403);
  assert.strictEqual(await go(mw(['JOB_EDIT']), { user: user(5, 'user') }), 'next');
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

test('page: signed out -> login; no job right -> home; any job right, or admin -> opens (odd spellings too)', async () => {
  assert.strictEqual((await page('user', [], '/jobs.html', false)).redirect, '/login.html');
  assert.strictEqual((await page('user', ['CUST_ADD', 'DEPT_ADD'], '/jobs.html')).redirect, '/home.html');
  assert.strictEqual((await page('user', ['JOB_ADD'], '/jobs.html')).next, true);
  assert.strictEqual((await page('user', ['JOB_DELETE'], '/JOBS.html')).next, true);
  assert.strictEqual((await page('user', ['JOB_EDIT'], '//jobs.html')).next, true);
  assert.strictEqual((await page('user', ['CUST_ADD'], '/%6aobs.html')).redirect, '/home.html');
  assert.strictEqual((await page('admin', [], '/jobs.html')).next, true);
});

test('menu: the HR tile opens the first Human Resources screen the person may use, and every HR screen keeps the tab lit', () => {
  const hr = [{ module_code: 'HR', module_name: 'Human Resources' }];
  const href = (role, codes) => buildMenu(user(5, role), hr, ['HR'], { all: role !== 'user', codes: new Set(codes) }).modules[0];
  assert.strictEqual(href('user', ['JOB_EDIT']).href, '/jobs.html');
  assert.strictEqual(href('user', ['DEPT_ADD']).href, '/departments.html');
  assert.strictEqual(href('user', ['JOB_ADD', 'DEPT_ADD']).href, '/departments.html');
  assert.strictEqual(href('admin', []).href, '/departments.html');
  assert.deepStrictEqual(href('user', ['JOB_ADD']).pages, ['/departments.html', '/jobs.html', '/employees.html', '/employee.html', '/job-history.html']);
  assert.strictEqual(buildMenu(user(5, 'user'), hr, ['HR']).modules[0].href, '/departments.html'); // rights not supplied: first screen
  assert.strictEqual(buildMenu(user(5, 'user'), [{ module_code: 'CUSTOMER', module_name: 'C' }], ['CUSTOMER'], { all: false, codes: new Set() }).modules[0].pages, undefined);
});
