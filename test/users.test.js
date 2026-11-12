'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createUserManagement } = require('../src/services/userManagement');

const row = (id, role, extra = {}) => ({
  user_id: id, first_name: `F${id}`, last_name: `L${id}`, email: `u${id}@x.test`,
  role, is_blocked: false, status: 'active', password_hash: 'secret-hash', email_verified_at: new Date(), ...extra,
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
    lockActiveSuperadmins: async () => state.users.filter((u) => u.role === 'superadmin' && !u.is_blocked && u.status === 'active'),
    setApproved: async (_db, id) => {
      const u = state.users.find((x) => x.user_id === id);
      if (!u || u.status !== 'pending') return null;
      u.status = 'active';
      return u;
    },
    setRole: async (_db, id, role) => { const u = state.users.find((x) => x.user_id === id); u.role = role; return u; },
  };
  const mailer = { send: async (m) => { state.sent.push(m); } };
  return { state, um: createUserManagement({ db: { tx: async (fn) => fn({}) }, repo, mailer, appUrl: 'http://x.test' }) };
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
  assert.strictEqual(r.body.user.email, 'u5@x.test'); // email is read-only on Edit User
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
  assert.strictEqual(state.tokens[0].purpose, 'first_password');
});

test('create: superadmin may pick a role; duplicate email -> 409; bad input -> 400', async () => {
  const { um } = setup(all);
  assert.strictEqual((await um.create(SA, { firstName: 'A', lastName: 'B', email: 'a@b.test', role: 'admin' })).body.user.role, 'admin');
  assert.strictEqual((await um.create(SA, { firstName: 'A', lastName: 'B', email: 'u5@x.test' })).status, 409);
  assert.strictEqual((await um.create(SA, { firstName: '', email: 'bad' })).status, 400);
});

test('edit: unknown or non-numeric id -> 404; get one works', async () => {
  const { um } = setup(all);
  assert.strictEqual((await um.get(SA, 5)).body.user.email, 'u5@x.test');
  assert.strictEqual((await um.get(SA, 999)).status, 404);
  assert.strictEqual((await um.block(SA, 999)).status, 404);
  assert.strictEqual((await um.block(SA, 'abc')).status, 404);
});

const PENDING = row(6, 'user', { status: 'pending' });
const tick = () => new Promise((r) => setImmediate(r));

test('approve: only a superadmin can approve; the user can then sign in (status active) and is emailed', async () => {
  const { um, state } = setup([...all, PENDING]);
  assert.strictEqual((await um.approve(AD, 6)).status, 403);
  assert.strictEqual(state.users.find((u) => u.user_id === 6).status, 'pending');
  const r = await um.approve(SA, 6);
  await tick();
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.user.status, 'active');
  assert.strictEqual(state.sent.length, 1);
  assert.match(state.sent[0].text, /approved/);
  assert.strictEqual(state.tokens.length, 0); // they already chose a password when registering
});

test('approve: refused until the person has confirmed their email', async () => {
  const { um, state } = setup([...all, row(8, 'user', { status: 'pending', email_verified_at: null })]);
  const r = await um.approve(SA, 8);
  assert.strictEqual(r.status, 409);
  assert.match(r.body.error, /confirm their email/);
  assert.strictEqual(state.users.find((u) => u.user_id === 8).status, 'pending');
  assert.strictEqual(state.sent.length, 0);
});

test('approve: already-active or missing accounts return 409/404', async () => {
  const { um } = setup([...all, PENDING]);
  assert.strictEqual((await um.approve(SA, 5)).status, 409);
  assert.strictEqual((await um.approve(SA, 999)).status, 404);
});

test('make-admin / remove-admin: superadmin only, approved users only, never yourself', async () => {
  const { um, state } = setup([...all, PENDING]);
  assert.strictEqual((await um.makeAdmin(AD, 5)).status, 403);
  assert.strictEqual((await um.makeAdmin(SA, 6)).status, 400); // still pending
  const made = await um.makeAdmin(SA, 5);
  assert.strictEqual(made.status, 200);
  assert.strictEqual(state.users.find((u) => u.user_id === 5).role, 'admin');
  assert.strictEqual((await um.makeAdmin(SA, 5)).status, 409); // already admin
  assert.strictEqual((await um.removeAdmin(AD, 5)).status, 403);
  assert.strictEqual((await um.removeAdmin(SA, 5)).status, 200);
  assert.strictEqual(state.users.find((u) => u.user_id === 5).role, 'user');
  assert.strictEqual((await um.makeAdmin(SA, 1)).status, 400); // self
});

test('editing a pending user cannot promote them past "user"', async () => {
  const { um } = setup([...all, PENDING]);
  const r = await um.update(SA, 6, { firstName: 'A', lastName: 'B', email: 'p@x.test', role: 'admin' });
  assert.strictEqual(r.status, 400);
});

test('list: only superadmins are offered Approve / Make admin / Remove admin', async () => {
  const { um } = setup([...all, PENDING]);
  const sa = (await um.list(SA, '')).body.users;
  assert.strictEqual(sa.find((u) => u.id === 6).canApprove, true);
  assert.strictEqual(sa.find((u) => u.id === 5).canMakeAdmin, true);
  assert.strictEqual(sa.find((u) => u.id === 6).canMakeAdmin, false);
  assert.strictEqual(sa.find((u) => u.id === 4).canRemoveAdmin, true);
  const ad = (await um.list(AD, '')).body.users;
  assert.ok(ad.every((u) => !u.canApprove && !u.canMakeAdmin && !u.canRemoveAdmin));
});

test('last superadmin: cannot be blocked or demoted (race: the other superadmin was already disabled)', async () => {
  // SA2 (still holding an old session) tries to disable SA, but SA2 itself was blocked a moment ago.
  const { um, state } = setup([SA, { ...SA2, is_blocked: true }, AD, U1]);
  assert.strictEqual((await um.block(SA2, 1)).status, 409);
  assert.strictEqual((await um.update(SA2, 1, { firstName: 'A', lastName: 'B', email: 'a@b.test', role: 'user' })).status, 409);
  assert.strictEqual(state.users[0].is_blocked, false);
  assert.strictEqual(state.users[0].role, 'superadmin');
});

test('stale session: a superadmin who was just blocked cannot disable another superadmin', async () => {
  const { um, state } = setup([SA, { ...SA2, is_blocked: true }, row(8, 'superadmin'), AD]);
  const r = await um.block(SA2, 8);
  assert.strictEqual(r.status, 403);
  assert.strictEqual(state.users.find((u) => u.user_id === 8).is_blocked, false);
});

test('guard does not get in the way when another live superadmin exists', async () => {
  const { um } = setup(all);
  assert.strictEqual((await um.block(SA, 2)).status, 200);
  assert.strictEqual((await um.update(SA, 2, { firstName: 'A', lastName: 'B', email: 'a@b.test', role: 'admin' })).status, 200);
});

test('list: only users can be given rights (Rights button flag)', async () => {
  const { um } = setup(all);
  const sa = (await um.list(SA, '')).body.users;
  assert.strictEqual(sa.find((u) => u.id === 5).canSetRights, true);
  assert.strictEqual(sa.find((u) => u.id === 4).canSetRights, false); // admin
  assert.strictEqual(sa.find((u) => u.id === 2).canSetRights, false); // superadmin
  const ad = (await um.list(AD, '')).body.users;
  assert.strictEqual(ad.find((u) => u.id === 5).canSetRights, true);
  assert.strictEqual(ad.find((u) => u.id === 4).canSetRights, false);
});
