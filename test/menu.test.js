'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildMenu } = require('../src/services/menu');
const { createPermissions } = require('../src/services/permissions');
const { requireRight } = require('../src/middleware/permissions');
const { guardPages, normalize } = require('../src/middleware/pageGuard');
const { createSessionToken } = require('../src/services/session');

const MODULES = [
  { module_code: 'CUST', module_name: 'Customer' },
  { module_code: 'PROD', module_name: 'Product' },
  { module_code: 'HR', module_name: 'Human Resources' },
];
const user = (id, role) => ({ user_id: id, first_name: 'F', last_name: 'L', email: `u${id}@x.test`, role, is_blocked: false, status: 'active' });

test('menu: admins and superadmins see every module plus User Management', () => {
  for (const role of ['admin', 'superadmin']) {
    const m = buildMenu(user(1, role), MODULES, []);
    assert.deepStrictEqual(m.modules.map((x) => x.code), ['CUST', 'PROD', 'HR']);
    assert.deepStrictEqual(m.admin.map((x) => x.key), ['users']);
  }
});

test('menu: a user sees only modules where they hold a right, and no admin items', () => {
  const m = buildMenu(user(5, 'user'), MODULES, ['PROD']);
  assert.deepStrictEqual(m.modules.map((x) => x.code), ['PROD']);
  assert.deepStrictEqual(m.admin, []);
  assert.deepStrictEqual(buildMenu(user(5, 'user'), MODULES, []).modules, []);
});

test('menu: never exposes ids or password data; modules without a page have no link', () => {
  const m = buildMenu({ ...user(5, 'user'), password_hash: 'secret' }, MODULES, ['CUST']);
  assert.ok(!JSON.stringify(m).includes('secret'));
  assert.strictEqual(m.modules[0].href, null);
});

function perms(rights) {
  return createPermissions({ db: {}, repo: { listUserRights: async () => rights } });
}

test('permissions: admins hold every right; users only what is ticked (any-of)', async () => {
  const p = perms(['CUST_ADD']);
  assert.strictEqual(await p.can(user(1, 'superadmin'), 'ANYTHING'), true);
  assert.strictEqual(await p.can(user(2, 'admin'), 'ANYTHING'), true);
  assert.strictEqual(await p.can(user(5, 'user'), 'CUST_ADD'), true);
  assert.strictEqual(await p.can(user(5, 'user'), 'CUST_DEL', 'CUST_ADD'), true);
  assert.strictEqual(await p.can(user(5, 'user'), 'CUST_DEL'), false);
  assert.strictEqual(await p.can(null, 'CUST_ADD'), false);
});

function run(mw, req) {
  return new Promise((resolve) => {
    const res = {
      status(code) { this.code = code; return this; },
      json(body) { resolve({ code: this.code, body }); },
    };
    mw(req, res, (err) => resolve({ next: true, err }));
  });
}

test('requireRight: 401 signed out, 403 without the right, passes with it', async () => {
  const mw = requireRight(perms(['CUST_ADD']), 'CUST_DEL');
  assert.strictEqual((await run(mw, {})).code, 401);
  assert.strictEqual((await run(mw, { user: user(5, 'user') })).code, 403);
  assert.strictEqual((await run(requireRight(perms(['CUST_ADD']), 'CUST_ADD'), { user: user(5, 'user') })).next, true);
  assert.strictEqual((await run(mw, { user: user(2, 'admin') })).next, true);
});

test('requireRight: a failing permission lookup is passed to the error handler, not allowed', async () => {
  const bad = createPermissions({ db: {}, repo: { listUserRights: async () => { throw new Error('db down'); } } });
  const r = await run(requireRight(bad, 'X'), { user: user(5, 'user') });
  assert.ok(r.err);
});

// ---- page guard ----
const SECRET = 's3cret';
function guardEnv(role) {
  const u = user(9, role);
  const db = { query: async (sql) => ({ rows: sql.includes('user_id = $1') ? [{ ...u, status: 'active' }] : [] }) };
  return guardPages(db, { sessionSecret: SECRET });
}
function page(mw, path, cookie) {
  return new Promise((resolve) => {
    const req = { path, headers: cookie ? { cookie: `hope_sid=${cookie}` } : {} };
    const res = {
      redirect(code, to) { resolve({ redirect: to, code }); },
      status(code) { return { send: () => resolve({ code }) }; },
      set() {},
    };
    mw(req, res, (err) => resolve({ next: true, err }));
  });
}
const cookieFor = (id) => createSessionToken(id, SECRET);

test('pages: signed-out visitors are sent to login for protected pages; other files pass through', async () => {
  const mw = guardEnv('user');
  assert.strictEqual((await page(mw, '/home.html')).redirect, '/login.html');
  assert.strictEqual((await page(mw, '/users.html')).redirect, '/login.html');
  assert.strictEqual((await page(mw, '/login.html')).next, true);
  assert.strictEqual((await page(mw, '/css/app.css')).next, true);
});

test('pages: plain users can open Home but are bounced from User Management; admins can open both', async () => {
  assert.strictEqual((await page(guardEnv('user'), '/home.html', cookieFor(9))).next, true);
  assert.strictEqual((await page(guardEnv('user'), '/users.html', cookieFor(9))).redirect, '/home.html');
  assert.strictEqual((await page(guardEnv('admin'), '/users.html', cookieFor(9))).next, true);
  assert.strictEqual((await page(guardEnv('superadmin'), '/users.html', cookieFor(9))).next, true);
});

test('pages: a forged or expired session cookie does not unlock a page', async () => {
  const mw = guardEnv('admin');
  assert.strictEqual((await page(mw, '/users.html', 'garbage.token')).redirect, '/login.html');
  assert.strictEqual((await page(mw, '/users.html', createSessionToken(9, 'wrong-secret'))).redirect, '/login.html');
});

test('pages: alternative spellings of a protected path are guarded too', async () => {
  const mw = guardEnv('user');
  for (const p of ['/USERS.HTML', '/Users.html', '/%75sers.html', '//users.html', '/a/../users.html', '/./users.html']) {
    assert.strictEqual((await page(mw, p, cookieFor(9))).redirect, '/home.html', p);
  }
  assert.strictEqual((await page(mw, '/%E0%A4%A')).code, 400); // malformed encoding is refused, not served
  assert.strictEqual(normalize('/%75sers.html'), '/users.html');
});
