'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { validateRegistration } = require('../src/validators/register');
const { hashPassword, verifyPassword } = require('../src/services/password');
const { registerUser } = require('../src/services/registration');

const good = { firstName: ' Ana ', lastName: 'Cruz', email: ' Ana@Example.COM ', password: 'secret123', confirmPassword: 'secret123' };

test('validator: accepts good input and normalizes it', () => {
  const { errors, value } = validateRegistration(good);
  assert.deepStrictEqual(errors, {});
  assert.strictEqual(value.email, 'ana@example.com');
  assert.strictEqual(value.firstName, 'Ana');
});

test('validator: rejects missing/bad fields', () => {
  const { errors } = validateRegistration({ email: 'nope', password: 'short' });
  assert.ok(errors.firstName && errors.lastName && errors.email && errors.password);
});

test('validator: password needs letter + number and must match confirmation', () => {
  assert.ok(validateRegistration({ ...good, password: 'abcdefgh', confirmPassword: 'abcdefgh' }).errors.password);
  assert.ok(validateRegistration({ ...good, confirmPassword: 'different1' }).errors.confirmPassword);
});

test('password: hash verifies, wrong password fails, hashes are salted', async () => {
  const h1 = await hashPassword('secret123');
  const h2 = await hashPassword('secret123');
  assert.notStrictEqual(h1, h2);
  assert.ok(!h1.includes('secret123'));
  assert.strictEqual(await verifyPassword('secret123', h1), true);
  assert.strictEqual(await verifyPassword('wrong', h1), false);
});

test('register: success creates a pending "user" with a hashed password', async () => {
  let call;
  const db = { query: async (sql, params) => { call = { sql, params }; return { rows: [{ user_id: 1 }] }; } };
  const res = await registerUser(db, { ...good, role: 'superadmin', status: 'active' }); // attempted mass-assignment
  assert.strictEqual(res.status, 201);
  assert.match(call.sql, /'user'/);
  assert.match(call.sql, /'pending'/);
  assert.ok(!call.sql.includes('superadmin'));
  assert.strictEqual(call.params[2], 'ana@example.com');
  assert.ok(call.params[3].startsWith('scrypt$'));
  assert.ok(!call.params.includes('secret123'));
});

test('register: duplicate email returns 409', async () => {
  const db = { query: async () => { const e = new Error('dup'); e.code = '23505'; throw e; } };
  const res = await registerUser(db, good);
  assert.strictEqual(res.status, 409);
  assert.ok(res.body.errors.email);
});

test('register: invalid input returns 400 and never touches the DB', async () => {
  const db = { query: async () => { throw new Error('should not be called'); } };
  assert.strictEqual((await registerUser(db, {})).status, 400);
});

test('register: unexpected DB errors propagate (become 500)', async () => {
  const db = { query: async () => { throw new Error('connection lost'); } };
  await assert.rejects(registerUser(db, good), /connection lost/);
});
