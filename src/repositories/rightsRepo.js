'use strict';

// SQL for the rights catalogue and per-user rights.
// Tables: module, right_catalog, user_permission (002_users_rights.sql). user_permission is soft-delete
// only (hard DELETE is blocked by a trigger), and its audit triggers log every ADD / EDIT / DELETE / RESTORE.

async function listCatalog(db) {
  const { rows } = await db.query(
    `SELECT m.module_code, m.module_name, r.right_code, r.description
     FROM module m JOIN right_catalog r ON r.module_code = m.module_code
     ORDER BY m.sort_order, r.sort_order, r.right_code`
  );
  return rows;
}

async function listUserRights(db, userId) {
  const { rows } = await db.query('SELECT right_code FROM user_permission_active WHERE user_id = $1', [userId]);
  return rows.map((r) => r.right_code);
}

// Serializes concurrent edits of the same person's rights.
async function lockUser(client, userId) {
  const { rows } = await client.query('SELECT user_id FROM app_user WHERE user_id = $1 AND NOT is_deleted FOR UPDATE', [userId]);
  return rows.length === 1;
}

// New rights are inserted; a right that was removed earlier is restored (never a second row).
async function grantRights(client, userId, rightCodes) {
  if (!rightCodes.length) return;
  await client.query(
    `INSERT INTO user_permission (user_id, right_code)
     SELECT $1, code FROM unnest($2::text[]) AS code
     ON CONFLICT (user_id, right_code) DO UPDATE SET is_deleted = FALSE WHERE user_permission.is_deleted`,
    [userId, rightCodes]
  );
}

// Un-ticking = soft delete, so history is kept.
async function revokeRights(client, userId, rightCodes) {
  if (!rightCodes.length) return;
  await client.query(
    'UPDATE user_permission SET is_deleted = TRUE WHERE user_id = $1 AND right_code = ANY($2::text[]) AND NOT is_deleted',
    [userId, rightCodes]
  );
}

module.exports = { listCatalog, listUserRights, lockUser, grantRights, revokeRights };
