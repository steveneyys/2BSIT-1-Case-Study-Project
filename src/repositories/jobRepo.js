'use strict';

// All SQL for the job table (S3-DEV-02). Reads go through job_active (soft-deleted rows excluded).
// Real schema: db/migrations/001_hope_base.sql (job: jobcode VARCHAR(4), jobdesc VARCHAR(20)).

const escapeLike = (text) => text.replace(/[\\%_]/g, '\\$&');

// Sort choices are mapped to fixed SQL text here; nothing the browser sends is ever put into the query.
const SORTS = { code: 'jobcode', description: 'lower(jobdesc)' };

// scope: 'active' (the view), 'deleted' or 'all' (the table itself; Admin screens only).
const SCOPES = { active: '', deleted: 'AND is_deleted', all: '' };

async function listJobs(db, { search, scope = 'active', sort, dir, limit, offset }) {
  const column = SORTS[sort] || SORTS.code;
  const direction = dir === 'desc' ? 'DESC' : 'ASC';
  const like = search ? `%${escapeLike(search)}%` : null;
  const known = Object.hasOwn(SCOPES, scope);
  const { rows } = await db.query(
    `SELECT jobcode, jobdesc, is_deleted, stamp, count(*) OVER () AS total
     FROM ${scope === 'active' || !known ? 'job_active' : 'job'}
     WHERE ($1::text IS NULL OR jobcode ILIKE $1 OR jobdesc ILIKE $1)
       ${known ? SCOPES[scope] : ''}
     ORDER BY ${column} ${direction}, jobcode ASC
     LIMIT $2 OFFSET $3`,
    [like, limit, offset]
  );
  return rows;
}

const COLUMNS = 'jobcode, jobdesc';

async function findJob(db, jobcode) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM job_active WHERE jobcode = $1`, [jobcode]);
  return rows[0] || null;
}

// Looks at the table itself so Add can tell "taken" from "taken by a deleted job".
async function findAnyJob(db, jobcode) {
  const { rows } = await db.query('SELECT jobcode, jobdesc, is_deleted FROM job WHERE jobcode = $1', [jobcode]);
  return rows[0] || null;
}

// Another live job with the same description (any capitalisation). `exceptCode` skips the row being edited.
async function findNameTaken(db, description, exceptCode = null) {
  const { rows } = await db.query(
    'SELECT jobcode FROM job_active WHERE lower(jobdesc) = lower($1) AND ($2::text IS NULL OR jobcode <> $2) LIMIT 1',
    [description, exceptCode]
  );
  return rows[0] || null;
}

// Two people saving at the same moment take turns, so the description check above cannot be beaten by a race.
async function lockNames(client) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('job_name'))");
}

async function insertJob(client, { code, description }) {
  const { rows } = await client.query(
    `INSERT INTO job (jobcode, jobdesc) VALUES ($1, $2) RETURNING ${COLUMNS}`,
    [code, description]
  );
  return rows[0];
}

// Only live rows can be edited; the code never changes. Returns null if the job is missing or deleted.
async function updateJob(client, jobcode, { description }) {
  const { rows } = await client.query(
    `UPDATE job SET jobdesc = $2 WHERE jobcode = $1 AND NOT is_deleted RETURNING ${COLUMNS}`,
    [jobcode, description]
  );
  return rows[0] || null;
}

// Numbers for the Active / Inactive / All tabs (whole table, not narrowed by the search box).
async function countJobs(db) {
  const { rows } = await db.query(
    'SELECT count(*) FILTER (WHERE NOT is_deleted) AS active, count(*) FILTER (WHERE is_deleted) AS deleted, count(*) AS total FROM job'
  );
  return { active: Number(rows[0].active), deleted: Number(rows[0].deleted), all: Number(rows[0].total) };
}

// Soft delete: the row stays, with is_deleted = true. The database refuses if job history still points at it (trg_check_children).
async function softDeleteJob(client, jobcode) {
  const { rows } = await client.query(
    `UPDATE job SET is_deleted = true WHERE jobcode = $1 AND NOT is_deleted RETURNING ${COLUMNS}`,
    [jobcode]
  );
  return rows[0] || null;
}

async function restoreJob(client, jobcode) {
  const { rows } = await client.query(
    `UPDATE job SET is_deleted = false WHERE jobcode = $1 AND is_deleted RETURNING ${COLUMNS}`,
    [jobcode]
  );
  return rows[0] || null;
}

async function countActiveJobHistory(db, jobcode) {
  const { rows } = await db.query('SELECT count(*) AS n FROM jobhistory_active WHERE jobcode = $1', [jobcode]);
  return Number(rows[0].n);
}

module.exports = {
  listJobs, findJob, findAnyJob, findNameTaken, lockNames, insertJob, updateJob,
  countJobs, softDeleteJob, restoreJob, countActiveJobHistory, escapeLike, SORTS,
};
