'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createGoogleVerifier, googleSignIn } = require('../src/services/googleAuth');

const CLIENT = 'client-123.apps.googleusercontent.com';
const good = (over = {}) => ({
  aud: CLIENT, iss: 'https://accounts.google.com', email: 'New.Person@Example.com', email_verified: 'true',
  exp: String(Math.floor(Date.now() / 1000) + 600), given_name: 'New', family_name: 'Person', ...over,
});
const fetchReturning = (info, ok = true) => async () => ({ ok, json: async () => info });

test('verifier accepts a valid token and lower-cases the email', async () => {
  const p = await createGoogleVerifier(CLIENT, fetchReturning(good()))('tok');
  assert.deepStrictEqual(p, { email: 'new.person@example.com', firstName: 'New', lastName: 'Person' });
});

test('verifier rejects wrong audience, unverified email, expired, wrong issuer, Google error, no client ID', async () => {
  const bad = [
    good({ aud: 'someone-else' }),
    good({ email_verified: 'false' }),
    good({ exp: String(Math.floor(Date.now() / 1000) - 5) }),
    good({ iss: 'https://evil.example' }),
  ];
  for (const info of bad) assert.strictEqual(await createGoogleVerifier(CLIENT, fetchReturning(info))('tok'), null);
  assert.strictEqual(await createGoogleVerifier(CLIENT, fetchReturning({}, false))('tok'), null);
  assert.strictEqual(await createGoogleVerifier(null, fetchReturning(good()))('tok'), null);
  assert.strictEqual(await createGoogleVerifier(CLIENT, async () => { throw new Error('offline'); })('tok'), null);
  assert.strictEqual(await createGoogleVerifier(CLIENT, fetchReturning(good()))(undefined), null);
});

function fakeDb(existing) {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push(sql);
      if (/INSERT INTO app_user/.test(sql)) return { rows: [{ user_id: 99 }] };
      return { rows: existing ? [existing] : [] };
    },
  };
}
const profile = { email: 'ana@example.com', firstName: 'Ana', lastName: 'Cruz' };
const verifyOk = async () => profile;
const user = (o = {}) => ({ user_id: 5, first_name: 'Ana', last_name: 'Cruz', email: 'ana@example.com', role: 'user', is_blocked: false, status: 'active', password_hash: null, ...o });

test('google: unknown email creates a Pending account and issues NO session', async () => {
  const db = fakeDb(null);
  const res = await googleSignIn(db, verifyOk, 'tok');
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.code, 'pending');
  assert.strictEqual(res.user, undefined);
  assert.ok(db.calls.some((s) => /INSERT INTO app_user/.test(s) && /'pending'/.test(s)));
});

test('google: Pending and Blocked accounts are refused; Active signs in', async () => {
  assert.strictEqual((await googleSignIn(fakeDb(user({ status: 'pending' })), verifyOk, 't')).body.code, 'pending');
  const blocked = await googleSignIn(fakeDb(user({ is_blocked: true })), verifyOk, 't');
  assert.strictEqual(blocked.body.code, 'blocked');
  assert.strictEqual(blocked.user, undefined);
  const ok = await googleSignIn(fakeDb(user()), verifyOk, 't');
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.user.user_id, 5);
});

test('google: a failed verification is a generic 401 and touches no data', async () => {
  const db = fakeDb(user());
  const res = await googleSignIn(db, async () => null, 'forged');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(db.calls.length, 0);
});
