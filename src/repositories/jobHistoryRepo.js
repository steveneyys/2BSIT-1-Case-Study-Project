'use strict';

// All SQL for the jobhistory table (S3-DEV-06). Key: (empno, jobcode, effdate). Dates come back as text (to_char).
// Rows are soft-deleted (is_deleted); the app also keeps one live row per employee per effective date.

const SELECT = `SELECT h.empno, h.jobcode, j.jobdesc, h.deptcode, d.deptname,
       to_char(h.effdate, 'YYYY-MM-DD') AS effdate, h.salary::text AS salary, h.is_deleted, h.stamp
  FROM jobhistory h
  LEFT JOIN job j ON j.jobcode = h.jobcode
  LEFT JOIN department d ON d.deptcode = h.deptcode`;

async function findEmployee(db, empno) {
  const { rows } = await db.query(
    `SELECT empno, lastname, firstname, to_char(hiredate, 'YYYY-MM-DD') AS hiredate,
            to_char(sepdate, 'YYYY-MM-DD') AS sepdate, is_deleted
       FROM employee WHERE empno = $1`,
    [empno]
  );
  return rows[0] || null;
}

// Newest first. Users never get deleted rows; Admins ask for them.
async function listHistory(db, empno, { includeDeleted = false } = {}) {
  const { rows } = await db.query(
    `${SELECT} WHERE h.empno = $1 ${includeDeleted ? '' : 'AND NOT h.is_deleted'} ORDER BY h.effdate DESC, h.jobcode ASC`,
    [empno]
  );
  return rows;
}

// Any row with this key, deleted or not.
async function findRow(db, empno, jobcode, effdate) {
  const { rows } = await db.query(`${SELECT} WHERE h.empno = $1 AND h.jobcode = $2 AND h.effdate = $3`, [empno, jobcode, effdate]);
  return rows[0] || null;
}

// Another live row of this employee with the same effective date. `except` skips the row being edited.
async function findLiveEffdate(db, empno, effdate, except = null) {
  const { rows } = await db.query(
    `SELECT jobcode FROM jobhistory_active
      WHERE empno = $1 AND effdate = $2 AND ($3::text IS NULL OR NOT (jobcode = $3 AND effdate = $4::date)) LIMIT 1`,
    [empno, effdate, except ? except.jobcode : null, except ? except.effdate : null]
  );
  return rows[0] || null;
}

// Two people saving rows for the same employee take turns, so the one-row-per-date check cannot be beaten by a race.
async function lockEmployee(client, empno) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('jobhistory:' || $1))", [empno]);
}

async function findJob(db, jobcode) {
  const { rows } = await db.query('SELECT jobcode FROM job_active WHERE jobcode = $1', [jobcode]);
  return rows[0] || null;
}

async function findDepartment(db, deptcode) {
  const { rows } = await db.query('SELECT deptcode FROM department_active WHERE deptcode = $1', [deptcode]);
  return rows[0] || null;
}

// Choices for the form's two drop-downs (live rows only).
async function listOptions(db) {
  const [jobs, depts] = await Promise.all([
    db.query('SELECT jobcode AS code, jobdesc AS description FROM job_active ORDER BY lower(jobdesc), jobcode'),
    db.query('SELECT deptcode AS code, deptname AS name FROM department_active ORDER BY lower(deptname), deptcode'),
  ]);
  return { jobs: jobs.rows, departments: depts.rows };
}

async function insertRow(client, empno, v) {
  await client.query(
    'INSERT INTO jobhistory (empno, jobcode, effdate, salary, deptcode) VALUES ($1, $2, $3, $4, $5)',
    [empno, v.jobcode, v.effdate, v.salary, v.deptcode]
  );
  return findRow(client, empno, v.jobcode, v.effdate);
}

// Only live rows can be edited. Job and date are part of the key, so they may change too. null if missing or deleted.
async function updateRow(client, empno, key, v) {
  const { rowCount } = await client.query(
    `UPDATE jobhistory SET jobcode = $4, effdate = $5, salary = $6, deptcode = $7
      WHERE empno = $1 AND jobcode = $2 AND effdate = $3 AND NOT is_deleted`,
    [empno, key.jobcode, key.effdate, v.jobcode, v.effdate, v.salary, v.deptcode]
  );
  return rowCount ? findRow(client, empno, v.jobcode, v.effdate) : null;
}

async function setDeleted(client, empno, key, deleted) {
  const { rowCount } = await client.query(
    'UPDATE jobhistory SET is_deleted = $4 WHERE empno = $1 AND jobcode = $2 AND effdate = $3 AND is_deleted = $5',
    [empno, key.jobcode, key.effdate, deleted, !deleted]
  );
  return rowCount ? findRow(client, empno, key.jobcode, key.effdate) : null;
}

const softDeleteRow = (client, empno, key) => setDeleted(client, empno, key, true);
const restoreRow = (client, empno, key) => setDeleted(client, empno, key, false);

module.exports = {
  findEmployee, listHistory, findRow, findLiveEffdate, lockEmployee, findJob, findDepartment, listOptions,
  insertRow, updateRow, softDeleteRow, restoreRow,
};
