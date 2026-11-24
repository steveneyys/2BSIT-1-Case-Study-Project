'use strict';

// All SQL for the employee table (S3-DEV-03). Reads go through employee_active (soft-deleted rows excluded).
// Real schema: db/migrations/001_hope_base.sql (employee: empno, lastname, firstname, gender M/F, birthdate, hiredate, sepdate).
// Dates are read back as text (to_char) so no time-zone shifting happens in node-pg or the browser.
// Job history and salary are NOT read here: they need the View Job History right (S3-DEV-08).

const escapeLike = (text) => text.replace(/[\\%_]/g, '\\$&');

// Sort choices are mapped to fixed SQL text here; nothing the browser sends is ever put into the query.
const SORTS = {
  empno: ['empno'],
  name: ['lower(lastname)', 'lower(firstname)'],
  gender: ['gender'],
  hired: ['hiredate'],
  separated: ['sepdate'],
};

// scope: 'active' (the view, which hides deleted rows), 'deleted' or 'all' (the table itself; Admin screens only).
const SCOPES = { active: '', deleted: 'AND is_deleted', all: '' };
// Separated = the employee has left the company (a separation date). Not the same as a deleted record.
const EMPLOYMENT = { employed: 'AND sepdate IS NULL', separated: 'AND sepdate IS NOT NULL' };

async function listEmployees(db, { search, gender, employment, scope = 'active', sort, dir, limit, offset }) {
  const columns = SORTS[sort] || SORTS.empno;
  const direction = dir === 'desc' ? 'DESC' : 'ASC';
  const orderBy = columns.map((c) => `${c} ${direction} NULLS LAST`).join(', ');
  const like = search ? `%${escapeLike(search)}%` : null;
  const known = Object.hasOwn(SCOPES, scope);
  const { rows } = await db.query(
    `SELECT empno, lastname, firstname, gender,
            to_char(birthdate, 'YYYY-MM-DD') AS birthdate, to_char(hiredate, 'YYYY-MM-DD') AS hiredate,
            to_char(sepdate, 'YYYY-MM-DD') AS sepdate, is_deleted, stamp, count(*) OVER () AS total
     FROM ${scope === 'active' || !known ? 'employee_active' : 'employee'}
     WHERE ($1::text IS NULL OR empno ILIKE $1 OR lastname ILIKE $1 OR firstname ILIKE $1
            OR (coalesce(firstname, '') || ' ' || coalesce(lastname, '')) ILIKE $1
            OR (coalesce(lastname, '') || ', ' || coalesce(firstname, '')) ILIKE $1)
       AND ($2::text IS NULL OR gender = $2)
       ${known ? SCOPES[scope] : ''}
       ${Object.hasOwn(EMPLOYMENT, employment) ? EMPLOYMENT[employment] : ''}
     ORDER BY ${orderBy}, empno ASC
     LIMIT $3 OFFSET $4`,
    [like, gender || null, limit, offset]
  );
  return rows;
}

// Numbers for the Active / Inactive / All tabs (whole table, not narrowed by the search box).
async function countEmployees(db) {
  const { rows } = await db.query(
    'SELECT count(*) FILTER (WHERE NOT is_deleted) AS active, count(*) FILTER (WHERE is_deleted) AS deleted, count(*) AS total FROM employee'
  );
  return { active: Number(rows[0].active), deleted: Number(rows[0].deleted), all: Number(rows[0].total) };
}

const COLUMNS = `empno, lastname, firstname, gender, to_char(birthdate, 'YYYY-MM-DD') AS birthdate,
  to_char(hiredate, 'YYYY-MM-DD') AS hiredate, to_char(sepdate, 'YYYY-MM-DD') AS sepdate`;

// Looks at the table itself so Add can tell "taken" from "taken by a deleted employee".
async function findAnyEmployee(db, empno) {
  const { rows } = await db.query('SELECT empno, is_deleted FROM employee WHERE empno = $1', [empno]);
  return rows[0] || null;
}

async function insertEmployee(client, v) {
  const { rows } = await client.query(
    `INSERT INTO employee (empno, lastname, firstname, gender, birthdate, hiredate, sepdate)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLUMNS}`,
    [v.empno, v.lastname, v.firstname, v.gender, v.birthdate, v.hiredate, v.sepdate]
  );
  return rows[0];
}

// Only live rows can be edited; the number never changes. Returns null if the employee is missing or deleted.
async function updateEmployee(client, empno, v) {
  const { rows } = await client.query(
    `UPDATE employee SET lastname = $2, firstname = $3, gender = $4, birthdate = $5, hiredate = $6, sepdate = $7
     WHERE empno = $1 AND NOT is_deleted RETURNING ${COLUMNS}`,
    [empno, v.lastname, v.firstname, v.gender, v.birthdate, v.hiredate, v.sepdate]
  );
  return rows[0] || null;
}

async function findEmployee(db, empno) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM employee_active WHERE empno = $1`, [empno]);
  return rows[0] || null;
}

// Soft delete: the row stays, with is_deleted = true. The separation date is NOT touched (leaving the company is a different fact).
// The database refuses if active job history or sales still point at the employee (trg_check_children).
async function softDeleteEmployee(client, empno) {
  const { rows } = await client.query(
    `UPDATE employee SET is_deleted = true WHERE empno = $1 AND NOT is_deleted RETURNING ${COLUMNS}`,
    [empno]
  );
  return rows[0] || null;
}

async function restoreEmployee(client, empno) {
  const { rows } = await client.query(
    `UPDATE employee SET is_deleted = false WHERE empno = $1 AND is_deleted RETURNING ${COLUMNS}`,
    [empno]
  );
  return rows[0] || null;
}

// Active records that block a delete: { history, sales }.
async function countActiveChildren(db, empno) {
  const { rows } = await db.query(
    `SELECT (SELECT count(*) FROM jobhistory_active WHERE empno = $1) AS history,
            (SELECT count(*) FROM sales_active WHERE empno = $1) AS sales`,
    [empno]
  );
  return { history: Number(rows[0].history), sales: Number(rows[0].sales) };
}

module.exports = {
  listEmployees, countEmployees, findEmployee, findAnyEmployee, insertEmployee, updateEmployee,
  softDeleteEmployee, restoreEmployee, countActiveChildren, escapeLike, SORTS,
};
