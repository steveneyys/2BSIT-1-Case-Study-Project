'use strict';

// All SQL for app_user and password tokens lives here. If the DB Admin's migrations
// (S1-DBA-03 / S1-DBA-04) use different column names, change them in this one file only.

const USER_COLUMNS = 'user_id, first_name, last_name, email, password_hash, role, is_blocked, status';

async function createPendingUser(db, { firstName, lastName, email, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO app_user (first_name, last_name, email, password_hash, role, is_blocked, status)
     VALUES ($1, $2, $3, $4, 'user', FALSE, 'pending')
     RETURNING user_id, email, status`,
    [firstName, lastName, email, passwordHash]
  );
  return rows[0];
}

async function findByEmail(db, email) {
  const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM app_user WHERE lower(email) = $1`, [email]);
  return rows[0] || null;
}

async function findById(db, userId) {
  const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM app_user WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

async function setPasswordHash(client, userId, passwordHash) {
  await client.query('UPDATE app_user SET password_hash = $1 WHERE user_id = $2', [passwordHash, userId]);
}

async function createPasswordToken(db, { userId, tokenHash, expiresAt }) {
  await db.query(
    'INSERT INTO password_token (user_id, token_hash, expires_at, used) VALUES ($1, $2, $3, FALSE)',
    [userId, tokenHash, expiresAt]
  );
}

// Atomically marks a valid token as used and returns its user id (or null). A token can only be
// consumed once, even with two simultaneous requests.
async function consumePasswordToken(client, tokenHash) {
  const { rows } = await client.query(
    `UPDATE password_token SET used = TRUE
     WHERE token_hash = $1 AND used = FALSE AND expires_at > now()
     RETURNING user_id`,
    [tokenHash]
  );
  return rows[0] ? rows[0].user_id : null;
}

module.exports = { createPendingUser, findByEmail, findById, setPasswordHash, createPasswordToken, consumePasswordToken };
