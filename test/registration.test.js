'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { validateRegistration } = require('../src/validators/register');
const { hashPassword, verifyPassword } = require('../src/services/password');
const { registerUser } = require('../src/services/registration');
const { hashToken } = require('../src/services/passwordToken');

const good = { firstName: ' Ana ', lastName: 'Cruz', email: ' Ana@Example.COM ', password: 'secret123', confirmPassword: 'secret123' };

function setup({ insertError, mailError } = {}) {
  const calls = [];
  const sent = [];
  const db = {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (/INSERT INTO app_user/.test(sql)) {
        if (insertError) throw insertError;
        return { rows: [{ user_id: 1, first_name: 'Ana', email: 'ana@example.com' }] };
      }
      return { rows: [] };
    },
  };
  const mailer = { send: async (m) => { if (mailError) throw mailError; sent.push(m); } };
  return { db, sent, deps: { mailer, appUrl: 'http://x.test' } };
}

test('validator: accepts good input and normalizes it', () => {
  const { errors, value } = validateRegistration(good);
  assert.deepStrictEqual(errors, {});
  assert.strictEqual(value.email, 'ana@example.com');
  assert.strictEqual(value.firstName, 'Ana');
});

test('validator: rejects missing/bad fields', () => {
  const { errors } = validateRegistration({ email: 'nope' });
  assert.ok(errors.firstName && errors.lastName && errors.email && errors.password);
});

test('validator: password rules and confirmation; role/status are never read', () => {
  assert.ok(validateRegistration({ ...good, password: 'short', confirmPassword: 'short' }).errors.password);
  assert.ok(validateRegistration({ ...good, confirmPassword: 'different1' }).errors.confirmPassword);
  const { value } = validateRegistration({ ...good, role: 'superadmin', status: 'active', isBlocked: true });
  assert.deepStrictEqual(Object.keys(value).sort(), ['email', 'firstName', 'lastName', 'password']);
});

test('validator: email longer than the database column (100) is rejected', () => {
  assert.ok(validateRegistration({ ...good, email: `${'a'.repeat(95)}@x.com` }).errors.email);
});

test('password: hash verifies, wrong password fails, hashes are salted', async () => {
  const h1 = await hashPassword('secret123');
  const h2 = await hashPassword('secret123');
  assert.notStrictEqual(h1, h2);
  assert.ok(!h1.includes('secret123'));
  assert.strictEqual(await verifyPassword('secret123', h1), true);
  assert.strictEqual(await verifyPassword('wrong', h1), false);
});

test('register: creates a pending "user" with a hashed password and emails a confirmation link', async () => {
  const { db, sent, deps } = setup();
  const res = await registerUser(db, { ...good, role: 'superadmin', status: 'active' }, deps); // attempted mass-assignment
  assert.strictEqual(res.status, 201);
  const insert = db.calls.find((c) => /INSERT INTO app_user/.test(c.sql));
  assert.match(insert.sql, /'user'/);
  assert.match(insert.sql, /'pending'/);
  assert.ok(!insert.sql.includes('superadmin'));
  assert.strictEqual(insert.params[2], 'ana@example.com');
  assert.ok(insert.params[3].startsWith('scrypt$'));
  assert.ok(!JSON.stringify(db.calls).includes('secret123'));
  // the confirmation link: only its hash is stored
  assert.strictEqual(sent.length, 1);
  const raw = sent[0].text.match(/token=([\w-]+)/)[1];
  const tokenInsert = db.calls.find((c) => /INSERT INTO email_verification_token/.test(c.sql));
  assert.strictEqual(tokenInsert.params[1], hashToken(raw));
  assert.ok(!db.calls.some((c) => (c.params || []).includes(raw)), 'raw token must never reach the DB');
  assert.match(sent[0].text, /http:\/\/x\.test\/api\/auth\/verify-email\?token=/);
});

test('register: a failed email does not undo the registration', async () => {
  const { db, deps } = setup({ mailError: new Error('smtp down') });
  const res = await registerUser(db, good, deps);
  assert.strictEqual(res.status, 201);
});

test('register: duplicate email returns 409 and sends nothing', async () => {
  const { db, sent, deps } = setup({ insertError: Object.assign(new Error('dup'), { code: '23505' }) });
  const res = await registerUser(db, good, deps);
  assert.strictEqual(res.status, 409);
  assert.ok(res.body.errors.email);
  assert.strictEqual(sent.length, 0);
});

test('register: invalid input returns 400 and never touches the DB', async () => {
  const db = { query: async () => { throw new Error('should not be called'); } };
  assert.strictEqual((await registerUser(db, {}, { mailer: {}, appUrl: 'x' })).status, 400);
});

test('register: unexpected DB errors propagate (become 500)', async () => {
  const { db, deps } = setup({ insertError: new Error('connection lost') });
  await assert.rejects(registerUser(db, good, deps), /connection lost/);
});

test('register: missing mail configuration is an error, not a silent skip', async () => {
  const { db } = setup();
  await assert.rejects(registerUser(db, good, {}), /not configured/);
});
