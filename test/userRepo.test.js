'use strict';

// Guards the SQL against the real schema (002_users_rights.sql / 003_password_token.sql).
const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/userRepo');

function recorder(rows = [{ user_id: 1 }]) {
  const calls = [];
  return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows }; } };
}

test('reads use the active view, never the raw table', async () => {
  const db = recorder();
  await repo.findByEmail(db, 'a@b.test');
  await repo.findById(db, 1);
  await repo.listUsers(db, { roles: ['user'], q: '' });
  for (const c of db.calls) assert.match(c.sql, /FROM app_user_active/);
});

test('real column names are used and aliased back to role/status', async () => {
  const db = recorder();
  await repo.findById(db, 1);
  assert.match(db.calls[0].sql, /role_code AS role/);
  assert.match(db.calls[0].sql, /approval_status AS status/);
});

test('lists and write results never return password_hash to the caller', async () => {
  const db = recorder();
  await repo.listUsers(db, { roles: ['user'], q: 'x' });
  await repo.insertUser(db, { firstName: 'A', lastName: 'B', email: 'a@b.test', role: 'user' });
  await repo.updateUser(db, 1, { firstName: 'A', lastName: 'B', email: 'a@b.test', role: 'user' });
  await repo.setBlocked(db, 1, true);
  for (const c of db.calls) {
    const returned = c.sql.includes('RETURNING') ? c.sql.split('RETURNING')[1] : c.sql.split('FROM')[0];
    assert.ok(!returned.includes('password_hash'), c.sql);
  }
});

test('updates skip soft-deleted rows', async () => {
  const db = recorder();
  await repo.updateUser(db, 1, { firstName: 'A', lastName: 'B', email: 'a@b.test', role: 'user' });
  await repo.setBlocked(db, 1, true);
  await repo.setPasswordHash(db, 1, 'h');
  for (const c of db.calls) assert.match(c.sql, /NOT is_deleted/);
});

test('password tokens use purpose + used_at (not a used flag)', async () => {
  const db = recorder();
  await repo.createPasswordToken(db, { userId: 1, tokenHash: 'h', expiresAt: new Date(), purpose: 'reset' });
  await repo.invalidateUserTokens(db, 1);
  await repo.consumePasswordToken(db, 'h');
  assert.match(db.calls[0].sql, /purpose/);
  assert.strictEqual(db.calls[0].params[2], 'reset');
  assert.match(db.calls[1].sql, /used_at = now\(\)/);
  assert.match(db.calls[2].sql, /used_at IS NULL AND expires_at > now\(\)/);
  for (const c of db.calls) assert.doesNotMatch(c.sql, /\bused = /);
});

test('last-superadmin lock selects only live superadmins and locks them', async () => {
  const db = recorder();
  await repo.lockActiveSuperadmins(db);
  const sql = db.calls[0].sql;
  assert.match(sql, /role_code = 'superadmin'/);
  assert.match(sql, /NOT is_blocked/);
  assert.match(sql, /approval_status = 'active'/);
  assert.match(sql, /NOT is_deleted/);
  assert.match(sql, /FOR UPDATE/);
});

test('approve only touches pending rows; setRole skips deleted rows', async () => {
  const db = recorder();
  await repo.setApproved(db, 1);
  await repo.setRole(db, 1, 'admin');
  assert.match(db.calls[0].sql, /approval_status = 'pending'/);
  assert.match(db.calls[1].sql, /NOT is_deleted/);
  assert.match(db.calls[1].sql, /role_code = \$1/);
});
