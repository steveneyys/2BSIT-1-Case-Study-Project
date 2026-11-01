'use strict';

// All SQL for app_user lives here. If the DB Admin's S1-DBA-03 migration uses different
// column names, change them in this one file only.

async function createPendingUser(db, { firstName, lastName, email, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO app_user (first_name, last_name, email, password_hash, role, is_blocked, status)
     VALUES ($1, $2, $3, $4, 'user', FALSE, 'pending')
     RETURNING user_id, email, status`,
    [firstName, lastName, email, passwordHash]
  );
  return rows[0];
}

module.exports = { createPendingUser };
