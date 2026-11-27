'use strict';

// S4-DEV-08: audit log viewer (Superadmin only).
const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/auditRepo');
const { parseAuditQuery, MODULES } = require('../src/validators/audit');
const { createAudit, changesOf } = require('../src/services/audit');
const { requireAuth, requireRole } = require('../src/middleware/auth');
const { createPermissions } = require('../src/services/permissions');
const { guardPages } = require('../src/middleware/pageGuard');
const { buildMenu } = require('../src/services/menu');
const { createSessionToken } = require('../src/services/session');

const user = (id, role) => ({ user_id: id, first_name: 'F', last_name: 'L', email: `u${id}@x.test`, role, is_blocked: false, status: 'active' });
const perms = (rights) => createPermissions({ db: {}, repo: { listUserRights: async () => rights } });
const recorder = (rows = []) => { const calls = []; return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows, rowCount: rows.length }; } }; };

// ---- validator ----
test('filters: all optional; defaults are page 1, 25 per page', () => {
  const { errors, value } = parseAuditQuery({});
  assert.deepStrictEqual(errors, {});
  assert.deepStrictEqual(value, { from: null, to: null, actor: null, module: null, action: null, ref: null, page: 1, pageSize: 25 });
});

test('filters: bad dates, reversed range, unknown module/action and long reference are refused', () => {
  assert.ok(parseAuditQuery({ from: '2026-02-30' }).errors.from);
  assert.ok(parseAuditQuery({ to: 'tomorrow' }).errors.to);
  assert.ok(parseAuditQuery({ from: '2026-11-10', to: '2026-11-01' }).errors.from);
  assert.ok(parseAuditQuery({ module: 'audit_log' }).errors.module);
  assert.ok(parseAuditQuery({ module: '__proto__' }).errors.module);
  assert.ok(parseAuditQuery({ action: 'TRUNCATE' }).errors.action);
  assert.ok(parseAuditQuery({ ref: 'x'.repeat(61) }).errors.ref);
  assert.deepStrictEqual(parseAuditQuery({ from: '2026-11-01', to: '2026-11-01', module: 'sales', action: 'edit' }).errors, {});
  assert.strictEqual(parseAuditQuery({ action: 'edit' }).value.action, 'EDIT');
});

test('paging: page size must be one of the offered sizes; bad page falls back to 1', () => {
  assert.strictEqual(parseAuditQuery({ pageSize: '100' }).value.pageSize, 100);
  assert.strictEqual(parseAuditQuery({ pageSize: '9999' }).value.pageSize, 25);
  assert.strictEqual(parseAuditQuery({ page: '-3' }).value.page, 1);
  assert.strictEqual(parseAuditQuery({ page: '4' }).value.page, 4);
});

// ---- repository SQL ----
test('listEvents: read-only, parameterised, newest first, Manila day boundaries', async () => {
  const db = recorder([]);
  await repo.listEvents(db, { from: '2026-11-01', to: '2026-11-26', actor: 'a@x.test', module: 'sales', action: 'EDIT', ref: 'TR_1%', page: 3, pageSize: 10 });
  const { sql, params } = db.calls[0];
  assert.match(sql, /FROM audit_log a/);
  assert.match(sql, /ORDER BY a\.action_at DESC, a\.audit_id DESC/);
  assert.match(sql, /Asia\/Manila/);
  assert.ok(!/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(sql));
  assert.ok(!sql.includes('a@x.test') && !sql.includes('TR_1'), 'values travel as parameters');
  assert.deepStrictEqual(params, ['2026-11-01', '2026-11-26', 'a@x.test', 'sales', 'EDIT', 'TR\\_1\\%', 10, 20]);
});

test('record reference: LIKE wildcards typed by the person are escaped', () => {
  assert.strictEqual(repo.escapeLike('50%_off\\'), '50\\%\\_off\\\\');
});

// ---- service ----
const ROW = (over = {}) => ({
  audit_id: '42', at: '2026-11-26 09:10:00', table_name: 'customer', action: 'EDIT', record_key: 'C-001', action_by: 'admin@hope.com',
  old_values: { custno: 'C-001', payterm: 'Net45', stamp: 'EDIT a 1' }, new_values: { custno: 'C-001', payterm: 'Net30', stamp: 'EDIT a 2' },
  first_name: 'Lisa', last_name: 'Park', role: 'admin', total: '1', ...over,
});

test('changesOf: edit lists only changed fields and skips the stamp', () => {
  assert.deepStrictEqual(changesOf('EDIT', ROW().old_values, ROW().new_values), [{ field: 'payterm', old: 'Net45', new: 'Net30' }]);
});

test('changesOf: add lists the values set; delete/restore show the flag that flipped', () => {
  assert.deepStrictEqual(changesOf('ADD', null, { custno: 'C-9', name: 'Acme', note: null, stamp: 's' }), [
    { field: 'custno', old: null, new: 'C-9' }, { field: 'name', old: null, new: 'Acme' },
  ]);
  assert.deepStrictEqual(changesOf('DELETE', { is_deleted: false, stamp: 'a' }, { is_deleted: true, stamp: 'b' }), [{ field: 'is_deleted', old: 'false', new: 'true' }]);
});

test('changesOf: sensitive fields are redacted and their values never leave the service', () => {
  const out = changesOf('EDIT', { password_hash: 'OLDSECRET', reset_token: 'T1', email: 'a' }, { password_hash: 'NEWSECRET', reset_token: 'T2', email: 'b' });
  assert.deepStrictEqual(out, [{ field: 'email', old: 'a', new: 'b' }, { field: 'password_hash', redacted: true }, { field: 'reset_token', redacted: true }]);
  assert.ok(!JSON.stringify(out).includes('SECRET'));
  const add = changesOf('ADD', null, { password_hash: 'NEWSECRET' });
  assert.ok(!JSON.stringify(add).includes('NEWSECRET'));
});

test('changesOf: long values are cut and objects shown as text', () => {
  const [c] = changesOf('ADD', null, { note: 'x'.repeat(500) });
  assert.strictEqual(c.new.length, 201);
  assert.strictEqual(changesOf('ADD', null, { o: { a: 1 } })[0].new, '{"a":1}');
});

test('list: Superadmin gets events with actor name, module label, action label and page info', async () => {
  const db = recorder();
  const svc = createAudit({ db, repo: { listEvents: async () => [ROW(), ROW({ audit_id: '41', table_name: 'weird_table', first_name: null, last_name: null, role: null, action_by: 'demo-seed', action: 'ADD', old_values: null })], countEvents: async () => 0 } });
  const { status, body } = await svc.list(user(1, 'superadmin'), { pageSize: '10' });
  assert.strictEqual(status, 200);
  assert.deepStrictEqual(body.events[0], {
    id: '42', at: '2026-11-26 09:10:00', actor: { id: 'admin@hope.com', name: 'Lisa Park', role: 'admin' },
    module: 'Customers', moduleKey: 'customer', action: 'EDIT', actionLabel: 'Edit', target: 'C-001', changes: [{ field: 'payterm', old: 'Net45', new: 'Net30' }],
  });
  assert.strictEqual(body.events[1].module, 'weird_table');
  assert.deepStrictEqual(body.events[1].actor, { id: 'demo-seed', name: null, role: null });
  assert.deepStrictEqual([body.total, body.page, body.pages, body.pageSize], [1, 1, 1, 10]);
});

test('list: a page past the end still reports the real total', async () => {
  const svc = createAudit({ db: {}, repo: { listEvents: async () => [], countEvents: async () => 30 } });
  const { body } = await svc.list(user(1, 'superadmin'), { page: '9', pageSize: '10' });
  assert.deepStrictEqual([body.events.length, body.total, body.pages, body.page], [0, 30, 3, 9]);
});

test('list: invalid filters give 400 with field messages and never reach the database', async () => {
  const svc = createAudit({ db: {}, repo: { listEvents: async () => assert.fail('must not query') } });
  const { status, body } = await svc.list(user(1, 'superadmin'), { from: 'nope', module: 'x' });
  assert.strictEqual(status, 400);
  assert.ok(body.errors.from && body.errors.module);
});

test('Admin and User get 403 with no data and no query', async () => {
  const boom = async () => assert.fail('must not query');
  const svc = createAudit({ db: {}, repo: { listEvents: boom, listActors: boom, countEvents: boom } });
  for (const role of ['admin', 'user']) {
    for (const r of [await svc.list(user(2, role), {}), await svc.options(user(2, role))]) {
      assert.strictEqual(r.status, 403);
      assert.deepStrictEqual(Object.keys(r.body), ['error']);
    }
  }
  assert.strictEqual((await svc.list(null, {})).status, 403);
});

test('options: actors from the log, every module and action', async () => {
  const svc = createAudit({ db: {}, repo: { listActors: async () => ['a@x.test'] } });
  const { body } = await svc.options(user(1, 'superadmin'));
  assert.deepStrictEqual(body.actors, ['a@x.test']);
  assert.strictEqual(body.modules.length, Object.keys(MODULES).length);
  assert.deepStrictEqual(body.actions.map((a) => a.key), ['ADD', 'EDIT', 'DELETE', 'RESTORE']);
});

// ---- route gate ----
const res = () => { const r = { code: null, status(c) { r.code = c; return r; }, json() { return r; } }; return r; };
const go = (mw, req) => new Promise((resolve) => { const r = res(); mw(req, r, () => resolve('next')); setImmediate(() => resolve(r.code)); });

test('API gate: signed out 401; User and Admin 403; only Superadmin passes (rights do not matter)', async () => {
  const gate = (req) => go((rq, rs, nx) => requireAuth(rq, rs, (e) => (e ? nx(e) : requireRole('superadmin')(rq, rs, nx))), req);
  assert.strictEqual(await gate({}), 401);
  assert.strictEqual(await gate({ user: user(5, 'user') }), 403);
  assert.strictEqual(await gate({ user: user(2, 'admin') }), 403);
  assert.strictEqual(await gate({ user: user(1, 'superadmin') }), 'next');
});

test('route file: only GET routes, and the whole router sits behind sign-in + Superadmin', async () => {
  const Module = require('node:module');
  const routes = [];
  const uses = [];
  const add = (method) => (path, ...fns) => routes.push({ method, path, fns });
  const router = { use: (...f) => uses.push(f), get: add('GET'), post: add('POST'), put: add('PUT'), delete: add('DELETE'), patch: add('PATCH') };
  const original = Module._load;
  Module._load = function (request, ...rest) { return request === 'express' ? { Router: () => router } : original.call(this, request, ...rest); };
  try {
    const resolved = require.resolve('../src/routes/audit');
    delete require.cache[resolved];
    require(resolved)({});
    delete require.cache[resolved];
  } finally { Module._load = original; }
  assert.deepStrictEqual(routes.map((r) => `${r.method} ${r.path}`).sort(), ['GET /', 'GET /options']);
  assert.strictEqual(uses.length, 1);
  const chain = uses[0];
  const run = async (req) => {
    for (const fn of chain) {
      const out = await new Promise((resolve) => { const r = { status(c) { this.code = c; return this; }, json() { resolve(this.code); } }; fn(req, r, () => resolve('next')); });
      if (out !== 'next') return out;
    }
    return 'pass';
  };
  assert.strictEqual(await run({}), 401);
  assert.strictEqual(await run({ user: user(5, 'user') }), 403);
  assert.strictEqual(await run({ user: user(2, 'admin') }), 403);
  assert.strictEqual(await run({ user: user(1, 'superadmin') }), 'pass');
});

// ---- page guard and menu ----
const SECRET = 's3cret';
function page(role, path, signedIn = true) {
  const u = user(9, role);
  const db = { query: async () => ({ rows: [u], rowCount: 1 }) };
  const mw = guardPages(db, { sessionSecret: SECRET }, undefined, perms([]));
  return new Promise((resolve) => {
    const req = { path, headers: signedIn ? { cookie: `hope_sid=${createSessionToken(9, SECRET)}` } : {} };
    const r = { redirect(code, to) { resolve({ redirect: to }); }, status() { return { send: () => resolve({}) }; }, set() {} };
    mw(req, r, (err) => resolve({ next: true, err }));
  });
}

test('page: /audit.html is Superadmin only; Admin and User are sent to the dashboard with the reason', async () => {
  assert.strictEqual((await page('user', '/audit.html', false)).redirect, '/login.html');
  assert.strictEqual((await page('user', '/audit.html')).redirect, '/home.html?restricted=audit');
  assert.strictEqual((await page('admin', '/audit.html')).redirect, '/home.html?restricted=audit');
  assert.strictEqual((await page('superadmin', '/audit.html')).next, true);
  assert.strictEqual((await page('admin', '/AUDIT.html')).redirect, '/home.html?restricted=audit', 'spelling tricks do not bypass it');
});

test('menu: the Audit Viewer entry exists for a Superadmin only, and is not a tab for anyone', () => {
  const mods = [{ module_code: 'CUST', module_name: 'Customers' }];
  assert.deepStrictEqual(buildMenu(user(1, 'superadmin'), mods, []).superadmin.map((x) => x.href), ['/audit.html']);
  assert.deepStrictEqual(buildMenu(user(2, 'admin'), mods, []).superadmin, []);
  assert.deepStrictEqual(buildMenu(user(5, 'user'), mods, ['CUST']).superadmin, []);
  assert.deepStrictEqual(buildMenu(user(1, 'superadmin'), mods, []).admin.map((x) => x.key), ['users']);
});
