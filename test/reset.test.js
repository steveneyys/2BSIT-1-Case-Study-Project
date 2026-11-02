'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { requestPasswordReset, setPassword } = require('../src/services/authService');
const { createMailer } = require('../src/services/mailer');
const { hashToken } = require('../src/services/passwordToken');
const { loadConfig } = require('../src/config');

function makeDb(user) {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (/FROM app_user_active WHERE lower\(email\)/.test(sql)) return { rows: user && params[0] === user.email ? [user] : [] };
      return { rows: [] };
    },
  };
}
const active = { user_id: 7, first_name: 'Ana', email: 'ana@example.com', is_blocked: false, status: 'active' };
const deps = () => { const sent = []; return { sent, mailer: { send: async (m) => sent.push(m) }, appUrl: 'http://x.test' }; };
const tick = () => new Promise((r) => setImmediate(r));

test('forgot: active user gets a link; only the token hash is stored; old links are cancelled', async () => {
  const db = makeDb(active); const d = deps();
  const res = await requestPasswordReset(db, { email: ' ANA@example.com ' }, d);
  await tick();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(d.sent.length, 1);
  const raw = d.sent[0].text.match(/token=([\w-]+)/)[1];
  const insert = db.calls.find((c) => /INSERT INTO password_token/.test(c.sql));
  assert.strictEqual(insert.params[1], hashToken(raw));
  assert.strictEqual(insert.params[2], 'reset');
  assert.ok(!db.calls.some((c) => c.params.includes(raw)), 'raw token must never reach the DB');
  assert.ok(db.calls.findIndex((c) => /SET used_at = now\(\) WHERE user_id/.test(c.sql)) < db.calls.indexOf(insert));
  assert.match(d.sent[0].text, /http:\/\/x\.test\/reset-password\.html\?token=/);
});

test('forgot: unknown, blocked and pending accounts get the same answer but no token and no email', async () => {
  const known = await requestPasswordReset(makeDb(active), { email: 'ana@example.com' }, deps());
  for (const user of [null, { ...active, is_blocked: true }, { ...active, status: 'pending' }]) {
    const db = makeDb(user); const d = deps();
    const res = await requestPasswordReset(db, { email: 'ana@example.com' }, d);
    await tick();
    assert.deepStrictEqual(res, known);
    assert.strictEqual(d.sent.length, 0);
    assert.ok(!db.calls.some((c) => /password_token/.test(c.sql)));
  }
});

test('forgot: empty email -> 400; mail failure does not break the response', async () => {
  assert.strictEqual((await requestPasswordReset(makeDb(null), {}, deps())).status, 400);
  const d = { appUrl: 'x', mailer: { send: async () => { throw new Error('smtp down'); } } };
  assert.strictEqual((await requestPasswordReset(makeDb(active), { email: 'ana@example.com' }, d)).status, 200);
  await tick();
});

test('reset: a link works once, then is rejected (reused token)', async () => {
  let used = false;
  const client = {
    query: async (sql) => {
      if (/UPDATE password_token/.test(sql)) { if (used) return { rows: [] }; used = true; return { rows: [{ user_id: 7 }] }; }
      return { rows: [] };
    },
  };
  const db = { tx: async (fn) => fn(client) };
  const body = { token: 't', password: 'newpass123', confirmPassword: 'newpass123' };
  assert.strictEqual((await setPassword(db, body)).status, 200);
  assert.strictEqual((await setPassword(db, body)).status, 400);
});

test('mailer: console transport when SMTP_HOST is unset', async () => {
  const lines = []; const orig = console.log; console.log = (...a) => lines.push(a.join(' '));
  try { await createMailer({}).send({ to: 'a@b.c', subject: 'S', text: 'LINK' }); } finally { console.log = orig; }
  assert.ok(lines.join('\n').includes('LINK'));
});

test('config: appUrl and smtp defaults', () => {
  const c = loadConfig({ NODE_ENV: 'test', PORT: '4000', SMTP_HOST: 'smtp.x.test' });
  assert.strictEqual(c.appUrl, 'http://localhost:4000');
  assert.strictEqual(c.smtp.host, 'smtp.x.test');
  assert.strictEqual(c.smtp.port, 587);
  assert.strictEqual(loadConfig({ NODE_ENV: 'test', APP_URL: 'https://erp.test/' }).appUrl, 'https://erp.test');
});
