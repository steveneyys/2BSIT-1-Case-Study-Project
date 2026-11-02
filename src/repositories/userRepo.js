'use strict';

// All SQL for app_user and password_token lives here.
// Real schema: db/migrations/002_users_rights.sql (S1-DBA-03) and 003_password_token.sql (S1-DBA-04).
// Column aliases keep the rest of the app independent of DB naming:
//   role_code AS role, approval_status AS status.
// Reads go through app_user_active (soft-deleted rows excluded); writes add "AND NOT is_deleted".

const USER_COLUMNS =
  'user_id, first_name, last_name, email, password_hash, role_code AS role, is_blocked, approval_status AS status';
// Same list without password_hash: used for anything that is sent back to a browser.
const LIST_COLUMNS = 'user_id, first_name, last_name, email, role_code AS role, is_blocked, approval_status AS status';

async function createPendingUser(db, { firstName, lastName, email, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO app_user (first_name, last_name, email, password_hash, role_code, is_blocked, approval_status)
     VALUES ($1, $2, $3, $4, 'user', FALSE, 'pending')
     RETURNING ${LIST_COLUMNS}`,
    [firstName, lastName, email, passwordHash]
  );
  return rows[0];
}

async function findByEmail(db, email) {
  const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM app_user_active WHERE lower(email) = $1`, [email]);
  return rows[0] || null;
}

async function findById(db, userId) {
  const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM app_user_active WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

async function setPasswordHash(client, userId, passwordHash) {
  await client.query('UPDATE app_user SET password_hash = $1 WHERE user_id = $2 AND NOT is_deleted', [passwordHash, userId]);
}

// --- User Management (S1-DEV-05) ---

async function listUsers(db, { roles, q }) {
  const params = [roles];
  let where = 'role_code = ANY($1)';
  if (q) {
    params.push(`%${q.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`);
    where += ` AND (lower(first_name || ' ' || last_name) LIKE $2 OR lower(email) LIKE $2)`;
  }
  const { rows } = await db.query(
    `SELECT ${LIST_COLUMNS} FROM app_user_active WHERE ${where} ORDER BY last_name, first_name, user_id LIMIT 200`,
    params
  );
  return rows;
}

// Admin-created accounts are active immediately but have no password: the person sets one via emailed link.
async function insertUser(db, { firstName, lastName, email, role }) {
  const { rows } = await db.query(
    `INSERT INTO app_user (first_name, last_name, email, password_hash, role_code, is_blocked, approval_status)
     VALUES ($1, $2, $3, NULL, $4, FALSE, 'active')
     RETURNING ${LIST_COLUMNS}`,
    [firstName, lastName, email, role]
  );
  return rows[0];
}

async function updateUser(db, userId, { firstName, lastName, email, role }) {
  const { rows } = await db.query(
    `UPDATE app_user SET first_name = $1, last_name = $2, email = $3, role_code = $4
     WHERE user_id = $5 AND NOT is_deleted RETURNING ${LIST_COLUMNS}`,
    [firstName, lastName, email, role, userId]
  );
  return rows[0] || null;
}

async function setBlocked(db, userId, isBlocked) {
  const { rows } = await db.query(
    `UPDATE app_user SET is_blocked = $1 WHERE user_id = $2 AND NOT is_deleted RETURNING ${LIST_COLUMNS}`,
    [isBlocked, userId]
  );
  return rows[0] || null;
}

// --- Approval, roles and the last-superadmin guard (S1-DEV-06) ---

// Locks every live superadmin row until the transaction ends, so two people cannot remove the last
// two superadmins at the same moment. "Live" = approved, not blocked, not deleted.
async function lockActiveSuperadmins(client) {
  const { rows } = await client.query(
    `SELECT user_id FROM app_user
     WHERE role_code = 'superadmin' AND NOT is_blocked AND approval_status = 'active' AND NOT is_deleted
     ORDER BY user_id FOR UPDATE`
  );
  return rows;
}

async function setApproved(db, userId) {
  const { rows } = await db.query(
    `UPDATE app_user SET approval_status = 'active'
     WHERE user_id = $1 AND approval_status = 'pending' AND NOT is_deleted RETURNING ${LIST_COLUMNS}`,
    [userId]
  );
  return rows[0] || null;
}

async function setRole(db, userId, role) {
  const { rows } = await db.query(
    `UPDATE app_user SET role_code = $1 WHERE user_id = $2 AND NOT is_deleted RETURNING ${LIST_COLUMNS}`,
    [role, userId]
  );
  return rows[0] || null;
}

// --- password_token (purpose: 'reset' for forgot-password, 'first_password' for invitations) ---

async function createPasswordToken(db, { userId, tokenHash, expiresAt, purpose }) {
  await db.query(
    'INSERT INTO password_token (user_id, token_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)',
    [userId, tokenHash, purpose, expiresAt]
  );
}

// Cancels every unused link for a user, so only the newest email works.
async function invalidateUserTokens(db, userId) {
  await db.query('UPDATE password_token SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [userId]);
}

// Used to tell the person WHY a link does not work (valid / used / expired / unknown). The caller must
// already hold the raw token, so this reveals nothing to anyone else.
async function findPasswordToken(db, tokenHash) {
  const { rows } = await db.query(
    'SELECT used_at, (expires_at > now()) AS live FROM password_token WHERE token_hash = $1',
    [tokenHash]
  );
  return rows[0] || null;
}

// Atomically marks a valid token as used and returns its user id (or null). A token can only be
// consumed once, even with two simultaneous requests. Tokens of deleted accounts are refused.
async function consumePasswordToken(client, tokenHash) {
  const { rows } = await client.query(
    `UPDATE password_token SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       AND user_id IN (SELECT user_id FROM app_user_active)
     RETURNING user_id`,
    [tokenHash]
  );
  return rows[0] ? rows[0].user_id : null;
}

module.exports = {
  createPendingUser, findByEmail, findById, setPasswordHash,
  listUsers, insertUser, updateUser, setBlocked, lockActiveSuperadmins, setApproved, setRole,
  createPasswordToken, invalidateUserTokens, findPasswordToken, consumePasswordToken,
};
