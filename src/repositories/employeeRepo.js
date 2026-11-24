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

module.exports = { listEmployees, countEmployees, escapeLike, SORTS };
