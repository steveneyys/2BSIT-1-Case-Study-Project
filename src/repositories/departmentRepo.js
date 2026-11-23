'use strict';

// All SQL for the department table (S3-DEV-01). Reads go through department_active (soft-deleted rows excluded).
// Real schema: db/migrations/001_hope_base.sql (department: deptcode VARCHAR(3), deptname VARCHAR(20)).

const escapeLike = (text) => text.replace(/[\\%_]/g, '\\$&');

// Sort choices are mapped to fixed SQL text here; nothing the browser sends is ever put into the query.
const SORTS = { code: 'deptcode', name: 'lower(deptname)' };

// scope: 'active' (the view), 'deleted' or 'all' (the table itself; Admin screens only).
const SCOPES = { active: '', deleted: 'AND is_deleted', all: '' };

async function listDepartments(db, { search, scope = 'active', sort, dir, limit, offset }) {
  const column = SORTS[sort] || SORTS.code;
  const direction = dir === 'desc' ? 'DESC' : 'ASC';
  const like = search ? `%${escapeLike(search)}%` : null;
  const known = Object.hasOwn(SCOPES, scope);
  const { rows } = await db.query(
    `SELECT deptcode, deptname, is_deleted, stamp, count(*) OVER () AS total
     FROM ${scope === 'active' || !known ? 'department_active' : 'department'}
     WHERE ($1::text IS NULL OR deptcode ILIKE $1 OR deptname ILIKE $1)
       ${known ? SCOPES[scope] : ''}
     ORDER BY ${column} ${direction}, deptcode ASC
     LIMIT $2 OFFSET $3`,
    [like, limit, offset]
  );
  return rows;
}

const COLUMNS = 'deptcode, deptname';

async function findDepartment(db, deptcode) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM department_active WHERE deptcode = $1`, [deptcode]);
  return rows[0] || null;
}

// Looks at the table itself so Add can tell "taken" from "taken by a deleted department".
async function findAnyDepartment(db, deptcode) {
  const { rows } = await db.query('SELECT deptcode, deptname, is_deleted FROM department WHERE deptcode = $1', [deptcode]);
  return rows[0] || null;
}

// Another live department with the same name (any capitalisation). `exceptCode` skips the row being edited.
async function findNameTaken(db, name, exceptCode = null) {
  const { rows } = await db.query(
    'SELECT deptcode FROM department_active WHERE lower(deptname) = lower($1) AND ($2::text IS NULL OR deptcode <> $2) LIMIT 1',
    [name, exceptCode]
  );
  return rows[0] || null;
}

// Two people saving at the same moment take turns, so the name check above cannot be beaten by a race.
async function lockNames(client) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('department_name'))");
}

async function insertDepartment(client, { code, name }) {
  const { rows } = await client.query(
    `INSERT INTO department (deptcode, deptname) VALUES ($1, $2) RETURNING ${COLUMNS}`,
    [code, name]
  );
  return rows[0];
}

// Only live rows can be edited; the code never changes. Returns null if the department is missing or deleted.
async function updateDepartment(client, deptcode, { name }) {
  const { rows } = await client.query(
    `UPDATE department SET deptname = $2 WHERE deptcode = $1 AND NOT is_deleted RETURNING ${COLUMNS}`,
    [deptcode, name]
  );
  return rows[0] || null;
}

// Numbers for the Active / Inactive / All tabs (whole table, not narrowed by the search box).
async function countDepartments(db) {
  const { rows } = await db.query(
    'SELECT count(*) FILTER (WHERE NOT is_deleted) AS active, count(*) FILTER (WHERE is_deleted) AS deleted, count(*) AS total FROM department'
  );
  return { active: Number(rows[0].active), deleted: Number(rows[0].deleted), all: Number(rows[0].total) };
}

// Soft delete: the row stays, with is_deleted = true. The database refuses if job history still points at it (trg_check_children).
async function softDeleteDepartment(client, deptcode) {
  const { rows } = await client.query(
    `UPDATE department SET is_deleted = true WHERE deptcode = $1 AND NOT is_deleted RETURNING ${COLUMNS}`,
    [deptcode]
  );
  return rows[0] || null;
}

async function restoreDepartment(client, deptcode) {
  const { rows } = await client.query(
    `UPDATE department SET is_deleted = false WHERE deptcode = $1 AND is_deleted RETURNING ${COLUMNS}`,
    [deptcode]
  );
  return rows[0] || null;
}

async function countActiveJobHistory(db, deptcode) {
  const { rows } = await db.query('SELECT count(*) AS n FROM jobhistory_active WHERE deptcode = $1', [deptcode]);
  return Number(rows[0].n);
}

module.exports = {
  listDepartments, findDepartment, findAnyDepartment, findNameTaken, lockNames, insertDepartment, updateDepartment,
  countDepartments, softDeleteDepartment, restoreDepartment, countActiveJobHistory, escapeLike, SORTS,
};
