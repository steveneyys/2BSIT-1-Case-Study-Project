'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createUserManagement } = require('../src/services/userManagement');

const row = (id, role, extra = {}) => ({
  user_id: id, first_name: `F${id}`, last_name: `L${id}`, email: `u${id}@x.test`,
  role, is_blocked: false, status: 'active', password_hash: 'secret-hash', ...extra,
});

function setup(users) {
  const state = { users: users.map((u) => ({ ...u })), tokens: [], sent: [] };
  const repo = {
    findById: async (_db, id) => state.users.find((u) => u.user_id === id) || null,
    listUsers: async (_db, { roles }) => state.users.filter((u) => roles.includes(u.role)),
    insertUser: async (_db, f) => {
      if (state.users.some((u) => u.email === f.email)) { const e = new Error('dup'); e.code = '23505'; throw e; }
      const u = row(100 + state.users.length, f.role, { first_name: f.firstName, last_name: f.lastName, email: f.email, password_hash: null });
      state.users.push(u);
      return u;
    },
    updateUser: async (_db, id, f) => {
      if (state.users.some((u) => u.email === f.email && u.user_id !== id)) { const e = new Error('dup'); e.code = '23505'; throw e; }
      const u = state.users.find((x) => x.user_id === id);
      Object.assign(u, { first_name: f.firstName, last_name: f.lastName, email: f.email, role: f.role });
      return u;
    },
    setBlocked: async (_db, id, b) => { const u = state.users.find((x) => x.user_id === id); u.is_blocked = b; return u; },
    createPasswordToken: async (_db, t) => { state.tokens.push(t); },
  };
  const mailer = { send: async (m) => { state.sent.push(m); } };
  return { state, um: createUserManagement({ db: {}, repo, mailer, appUrl: 'http://x.test' }) };
}

const SA = row(1, 'superadmin');
const SA2 = row(2, 'superadmin');
const AD = row(3, 'admin');
const AD2 = row(4, 'admin');
const U1 = row(5, 'user');
const all = [SA, SA2, AD, AD2, U1];

test('list: superadmin sees everyone; admin never sees superadmins', async () => {
  const { um } = setup(all);
  assert.strictEqual((await um.list(SA, '')).body.users.length, 5);
  const adminView = (await um.list(AD, '')).body.users;
  assert.deepStrictEqual(adminView.map((u) => u.role).sort(), ['admin', 'admin', 'user']);
});

test('list: admin can manage users only; other admin rows have no actions', async () => {
  const { um } = setup(all);
  const v = (await um.list(AD, '')).body.users;
  assert.strictEqual(v.find((u) => u.id === 5).canManage, true);
  assert.strictEqual(v.find((u) => u.id === 4).canManage, false);
  assert.strictEqual(v.find((u) => u.id === 3).canManage, false); // even their own admin row
});

test('list: responses never contain password hashes', async () => {
  const { um } = setup(all);
  assert.ok(!JSON.stringify((await um.list(SA, '')).body).includes('secret-hash'));
});

test('admin cannot see, edit or block a superadmin (server returns 404, not 403)', async () => {
  const { um, state } = setup(all);
  assert.strictEqual((await um.update(AD, 1, { firstName: 'X', lastName: 'Y', email: 'x@y.test' })).status, 404);
  assert.strictEqual((await um.block(AD, 1)).status, 404);
  assert.strictEqual(state.users[0].is_blocked, false);
});

test('admin cannot edit or block another admin', async () => {
  const { um } = setup(all);
  assert.strictEqual((await um.block(AD, 4)).status, 403);
  assert.strictEqual((await um.update(AD, 4, { firstName: 'X', lastName: 'Y', email: 'x@y.test' })).status, 403);
});

test('admin can block, unblock and edit a user', async () => {
  const { um, state } = setup(all);
  assert.strictEqual((await um.block(AD, 5)).status, 200);
  assert.strictEqual(state.users[4].is_blocked, true);
  assert.strictEqual((await um.unblock(AD, 5)).status, 200);
  const r = await um.update(AD, 5, { firstName: ' Ann ', lastName: 'Lee', email: 'ANN@x.test' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.user.email, 'ann@x.test');
  assert.strictEqual(r.body.user.role, 'user');
});

test('admin cannot change roles (edit) or create non-user roles', async () => {
  const { um, state } = setup(all);
  const e = await um.update(AD, 5, { firstName: 'A', lastName: 'B', email: 'a@b.test', role: 'admin' });
  assert.strictEqual(e.status, 403);
  assert.strictEqual(state.users[4].role, 'user');
  assert.strictEqual((await um.create(AD, { firstName: 'A', lastName: 'B', email: 'n@b.test', role: 'superadmin' })).status, 403);
});

test('nobody can block themselves; superadmin can block other superadmins', async () => {
  const { um } = setup(all);
  assert.strictEqual((await um.block(SA, 1)).status, 400);
  assert.strictEqual((await um.block(SA, 2)).status, 200);
});

test('superadmin can change roles but not their own', async () => {
  const { um } = setup(all);
  const f = { firstName: 'A', lastName: 'B', email: 'a@b.test' };
  assert.strictEqual((await um.update(SA, 5, { ...f, role: 'admin' })).body.user.role, 'admin');
  assert.strictEqual((await um.update(SA, 1, { ...f, email: 's@b.test', role: 'user' })).status, 400);
  assert.strictEqual((await um.update(SA, 5, { ...f, role: 'god' })).status, 400);
});

test('create: admin-made account is a pending-password "user"; link emailed; raw token not stored', async () => {
  const { um, state } = setup(all);
  const r = await um.create(AD, { firstName: 'New', lastName: 'Person', email: 'New@x.test' });
  await new Promise((res) => setImmediate(res));
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.user.role, 'user');
  assert.strictEqual(state.sent.length, 1);
  const raw = state.sent[0].text.match(/token=([\w-]+)/)[1];
  assert.ok(!JSON.stringify(state.tokens).includes(raw));
  assert.strictEqual(state.tokens.length, 1);
});

test('create: superadmin may pick a role; duplicate email -> 409; bad input -> 400', async () => {
  const { um } = setup(all);
  assert.strictEqual((await um.create(SA, { firstName: 'A', lastName: 'B', email: 'a@b.test', role: 'admin' })).body.user.role, 'admin');
  assert.strictEqual((await um.create(SA, { firstName: 'A', lastName: 'B', email: 'u5@x.test' })).status, 409);
  assert.strictEqual((await um.create(SA, { firstName: '', email: 'bad' })).status, 400);
});

test('edit: duplicate email -> 409; unknown or non-numeric id -> 404', async () => {
  const { um } = setup(all);
  assert.strictEqual((await um.update(SA, 5, { firstName: 'A', lastName: 'B', email: 'u3@x.test' })).status, 409);
  assert.strictEqual((await um.block(SA, 999)).status, 404);
  assert.strictEqual((await um.block(SA, 'abc')).status, 404);
});
