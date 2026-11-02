'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createRights, auditName, groupCatalog } = require('../src/services/rights');
const rightsRepoSql = require('../src/repositories/rightsRepo');

const CATALOG = [
  { module_code: 'CUST', module_name: 'Customer', right_code: 'CUST_ADD', description: 'Add Customer' },
  { module_code: 'CUST', module_name: 'Customer', right_code: 'CUST_EDIT', description: 'Edit Customer' },
  { module_code: 'CUST', module_name: 'Customer', right_code: 'CUST_DEL', description: 'Delete Customer' },
  { module_code: 'PROD', module_name: 'Product', right_code: 'PROD_ADD', description: 'Add Product' },
];
const u = (id, role, extra = {}) => ({ user_id: id, first_name: `F${id}`, last_name: `L${id}`, email: `user${id}@example.com`, role, status: 'active', is_blocked: false, ...extra });
const SA = u(1, 'superadmin');
const AD = u(2, 'admin');
const U1 = u(5, 'user');
const U2 = u(6, 'user');

function setup(granted = {}) {
  const state = { users: [SA, AD, U1, U2], granted: { ...granted }, log: [], txUser: null, locked: [] };
  const userRepo = { findById: async (_db, id) => state.users.find((x) => x.user_id === id) || null };
  const repo = {
    listCatalog: async () => CATALOG,
    listUserRights: async (_c, id) => [...(state.granted[id] || [])],
    lockUser: async (_c, id) => { state.locked.push(id); return state.users.some((x) => x.user_id === id); },
    grantRights: async (_c, id, codes) => { state.log.push(['grant', id, codes]); state.granted[id] = [...(state.granted[id] || []), ...codes]; },
    revokeRights: async (_c, id, codes) => { state.log.push(['revoke', id, codes]); state.granted[id] = (state.granted[id] || []).filter((c) => !codes.includes(c)); },
  };
  const db = { txAs: async (name, fn) => { state.txUser = name; return fn({}); } };
  return { state, svc: createRights({ db, repo, userRepo }) };
}

test('catalog is grouped by module in catalogue order', () => {
  const g = groupCatalog(CATALOG);
  assert.deepStrictEqual(g.map((m) => [m.moduleCode, m.rights.length]), [['CUST', 3], ['PROD', 1]]);
});

test('get: returns the user\'s current rights', async () => {
  const { svc } = setup({ 5: ['CUST_EDIT', 'CUST_ADD'] });
  const r = await svc.getUserRights(AD, 5);
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body.rights, ['CUST_ADD', 'CUST_EDIT']);
});

test('set: grants and revokes only the difference, and names the real actor for the audit log', async () => {
  const { svc, state } = setup({ 5: ['CUST_ADD', 'CUST_EDIT'] });
  const r = await svc.setUserRights(AD, 5, { rights: ['CUST_EDIT', 'PROD_ADD'] });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body.changes, { granted: ['PROD_ADD'], revoked: ['CUST_ADD'] });
  assert.deepStrictEqual(state.log, [['grant', 5, ['PROD_ADD']], ['revoke', 5, ['CUST_ADD']]]);
  assert.strictEqual(state.txUser, 'user2@example.com'); // db.txAs sets app.username to this
  assert.deepStrictEqual(state.locked, [5]);
});

test('set: an unchanged list writes nothing (no audit noise)', async () => {
  const { svc, state } = setup({ 5: ['CUST_ADD'] });
  const r = await svc.setUserRights(AD, 5, { rights: ['CUST_ADD'] });
  assert.deepStrictEqual(r.body.changes, { granted: [], revoked: [] });
  assert.ok(state.log.every(([, , codes]) => codes.length === 0));
});

test('set: "None" removes everything; "All" grants everything; duplicates are ignored', async () => {
  const { svc, state } = setup({ 5: ['CUST_ADD', 'PROD_ADD'] });
  assert.strictEqual((await svc.setUserRights(SA, 5, { rights: [] })).body.changes.revoked.length, 2);
  assert.deepStrictEqual(state.granted[5], []);
  const all = await svc.setUserRights(SA, 5, { rights: CATALOG.map((c) => c.right_code).concat('CUST_ADD') });
  assert.strictEqual(all.body.changes.granted.length, 4);
});

test('set: unknown codes and malformed bodies are rejected before anything is written', async () => {
  const { svc, state } = setup();
  assert.strictEqual((await svc.setUserRights(AD, 5, { rights: ['CUST_ADD', 'HACK'] })).status, 400);
  assert.strictEqual((await svc.setUserRights(AD, 5, { rights: 'CUST_ADD' })).status, 400);
  assert.strictEqual((await svc.setUserRights(AD, 5, {})).status, 400);
  assert.strictEqual((await svc.setUserRights(AD, 5, { rights: [1] })).status, 400);
  assert.deepStrictEqual(state.log, []);
  assert.strictEqual(state.txUser, null);
});

test('rights apply to users only; superadmins are invisible to admins', async () => {
  const { svc, state } = setup();
  assert.strictEqual((await svc.setUserRights(SA, 2, { rights: ['CUST_ADD'] })).status, 400); // target is an admin
  assert.strictEqual((await svc.getUserRights(AD, 1)).status, 404); // hidden superadmin
  assert.strictEqual((await svc.setUserRights(AD, 1, { rights: [] })).status, 404);
  assert.strictEqual((await svc.getUserRights(AD, 999)).status, 404);
  assert.strictEqual((await svc.getUserRights(AD, 'abc')).status, 404);
  assert.deepStrictEqual(state.log, []);
});

test('audit name always fits the database columns (stamp VARCHAR(60), action_by VARCHAR(50))', () => {
  const name = auditName({ email: `${'x'.repeat(80)}@example.com` });
  assert.ok(name.length <= 30);
  assert.ok(`RESTORE ${name} 2026-10-12 11:18 AM`.length <= 60);
});

function recorder(rows = []) {
  const calls = [];
  return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows }; } };
}

test('SQL: rights are soft-deleted (never DELETE) and restored through ON CONFLICT', async () => {
  const db = recorder();
  await rightsRepoSql.grantRights(db, 5, ['CUST_ADD']);
  await rightsRepoSql.revokeRights(db, 5, ['CUST_ADD']);
  assert.match(db.calls[0].sql, /ON CONFLICT \(user_id, right_code\) DO UPDATE SET is_deleted = FALSE WHERE user_permission\.is_deleted/);
  assert.match(db.calls[1].sql, /UPDATE user_permission SET is_deleted = TRUE/);
  for (const c of db.calls) assert.doesNotMatch(c.sql, /DELETE FROM/);
});

test('SQL: empty grant/revoke lists make no query; reads use the active view; user row is locked', async () => {
  const db = recorder();
  await rightsRepoSql.grantRights(db, 5, []);
  await rightsRepoSql.revokeRights(db, 5, []);
  assert.strictEqual(db.calls.length, 0);
  await rightsRepoSql.listUserRights(db, 5);
  await rightsRepoSql.lockUser(db, 5);
  assert.match(db.calls[0].sql, /user_permission_active/);
  assert.match(db.calls[1].sql, /FOR UPDATE/);
});
