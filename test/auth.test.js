'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createSessionToken, verifySessionToken, parseCookies } = require('../src/services/session');
const { login, setPassword } = require('../src/services/authService');
const { hashPassword } = require('../src/services/password');
const { hashToken } = require('../src/services/passwordToken');

const SECRET = 'test-secret';

test('session: valid token round-trips to the user id', () => {
  assert.strictEqual(verifySessionToken(createSessionToken(42, SECRET), SECRET), 42);
});

test('session: tampered, wrong-secret, expired and garbage tokens are rejected', () => {
  const t = createSessionToken(42, SECRET);
  const [payload, sig] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ uid: 1, exp: Date.now() + 1e9 })).toString('base64url');
  assert.strictEqual(verifySessionToken(`${forged}.${sig}`, SECRET), null);
  assert.strictEqual(verifySessionToken(t, 'other-secret'), null);
  assert.strictEqual(verifySessionToken(t, SECRET, Date.now() + 9 * 3600 * 1000), null);
  assert.strictEqual(verifySessionToken(`${payload}.`, SECRET), null);
  assert.strictEqual(verifySessionToken(undefined, SECRET), null);
  assert.strictEqual(verifySessionToken('a.b', SECRET), null);
});

test('parseCookies reads several cookies', () => {
  assert.deepStrictEqual(parseCookies('a=1; hope_sid=x.y; b=2'), { a: '1', hope_sid: 'x.y', b: '2' });
});

async function dbWithUser(overrides = {}) {
  const user = {
    user_id: 7, first_name: 'Ana', last_name: 'Cruz', email: 'ana@example.com',
    password_hash: await hashPassword('secret123'), role: 'user', is_blocked: false, status: 'active', ...overrides,
  };
  return { query: async (_sql, [email]) => ({ rows: email === user.email ? [user] : [] }) };
}

test('login: success returns the user without the password hash', async () => {
  const res = await login(await dbWithUser(), { email: ' ANA@example.com ', password: 'secret123' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.email, 'ana@example.com');
  assert.ok(!JSON.stringify(res.body).includes('password'));
});

test('login: wrong password and unknown email give the same generic 401', async () => {
  const db = await dbWithUser();
  const wrong = await login(db, { email: 'ana@example.com', password: 'nope12345' });
  const unknown = await login(db, { email: 'who@example.com', password: 'secret123' });
  assert.strictEqual(wrong.status, 401);
  assert.deepStrictEqual(wrong.body, unknown.body);
  assert.strictEqual(unknown.status, 401);
});

test('login: account with no password set cannot sign in', async () => {
  const res = await login(await dbWithUser({ password_hash: null }), { email: 'ana@example.com', password: 'secret123' });
  assert.strictEqual(res.status, 401);
});

test('login: blocked and pending users are refused even with the right password', async () => {
  const blocked = await login(await dbWithUser({ is_blocked: true }), { email: 'ana@example.com', password: 'secret123' });
  const pending = await login(await dbWithUser({ status: 'pending' }), { email: 'ana@example.com', password: 'secret123' });
  assert.strictEqual(blocked.status, 403);
  assert.match(blocked.body.error, /blocked/i);
  assert.strictEqual(pending.status, 403);
  assert.match(pending.body.error, /approval/i);
  assert.strictEqual(blocked.user, undefined);
});

test('login: blocked user with the wrong password is not told the account is blocked', async () => {
  const res = await login(await dbWithUser({ is_blocked: true }), { email: 'ana@example.com', password: 'wrong1234' });
  assert.strictEqual(res.status, 401);
});

test('login: missing fields -> 400', async () => {
  assert.strictEqual((await login({}, {})).status, 400);
});

function dbForToken(validHash) {
  const calls = [];
  const client = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (/UPDATE password_token/.test(sql)) return { rows: params[0] === validHash ? [{ user_id: 7 }] : [] };
      return { rows: [] };
    },
  };
  // db.query serves the read-only "why does this link not work" lookup; `rows` lets a test choose what it finds.
  const db = { calls, tx: async (fn) => fn(client), lookup: [], query: async () => ({ rows: db.lookup }) };
  return db;
}

test('set-password: valid token sets a hashed password exactly once', async () => {
  const db = dbForToken(hashToken('good-token'));
  const res = await setPassword(db, { token: 'good-token', password: 'newpass123', confirmPassword: 'newpass123' });
  assert.strictEqual(res.status, 200);
  const update = db.calls.find((c) => /UPDATE app_user/.test(c.sql));
  assert.ok(update.params[0].startsWith('scrypt$'));
  assert.strictEqual(update.params[1], 7);
  assert.ok(!db.calls.some((c) => c.params.includes('good-token')), 'raw token must never reach the DB');
});

test('set-password: bad/expired/reused token changes nothing', async () => {
  const db = dbForToken(hashToken('good-token'));
  const res = await setPassword(db, { token: 'other', password: 'newpass123', confirmPassword: 'newpass123' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.code, 'invalid');
  assert.ok(!db.calls.some((c) => /UPDATE app_user/.test(c.sql)));
});

test('set-password: tells the page whether the link is used or expired', async () => {
  const bad = { token: 'other', password: 'newpass123', confirmPassword: 'newpass123' };
  const used = dbForToken('x'); used.lookup = [{ used_at: new Date(), live: true }];
  assert.strictEqual((await setPassword(used, bad)).body.code, 'used');
  const expired = dbForToken('x'); expired.lookup = [{ used_at: null, live: false }];
  assert.strictEqual((await setPassword(expired, bad)).body.code, 'expired');
});

test('passwordTokenStatus: valid / used / expired / invalid', async () => {
  const { passwordTokenStatus } = require('../src/services/authService');
  const q = (rows) => ({ query: async () => ({ rows }) });
  assert.strictEqual(await passwordTokenStatus(q([{ used_at: null, live: true }]), 't'), 'valid');
  assert.strictEqual(await passwordTokenStatus(q([{ used_at: new Date(), live: true }]), 't'), 'used');
  assert.strictEqual(await passwordTokenStatus(q([{ used_at: null, live: false }]), 't'), 'expired');
  assert.strictEqual(await passwordTokenStatus(q([]), 't'), 'invalid');
  assert.strictEqual(await passwordTokenStatus(q([]), ''), 'invalid');
});

test('login: pending account with no password gets the Pending banner; blocked gets the Blocked banner', async () => {
  const p = await login(await dbWithUser({ password_hash: null, status: 'pending' }), { email: 'ana@example.com', password: 'whatever1' });
  assert.strictEqual(p.status, 403);
  assert.strictEqual(p.body.code, 'pending');
  const b = await login(await dbWithUser({ is_blocked: true }), { email: 'ana@example.com', password: 'secret123' });
  assert.strictEqual(b.body.code, 'blocked');
});

test('session: remember-me lifetime is honoured', () => {
  const now = Date.now();
  const t = createSessionToken(1, SECRET, now, 7 * 24 * 3600 * 1000);
  assert.strictEqual(verifySessionToken(t, SECRET, now + 6 * 24 * 3600 * 1000), 1);
  assert.strictEqual(verifySessionToken(t, SECRET, now + 8 * 24 * 3600 * 1000), null);
});

test('set-password: weak or mismatched password is rejected before touching the token', async () => {
  const db = dbForToken('x');
  assert.strictEqual((await setPassword(db, { token: 't', password: 'short', confirmPassword: 'short' })).status, 400);
  assert.strictEqual((await setPassword(db, { token: 't', password: 'newpass123', confirmPassword: 'diff12345' })).status, 400);
  assert.strictEqual(db.calls.length, 0);
});
