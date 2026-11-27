'use strict';

// Read-only SQL for the reports (S4-DEV-04: list reports). Nothing here writes. Dates come back as text (to_char).
// Deleted rows are never in a report: every query reads a *_active view.

// Every live product with its price on `date` (null price = none yet). Migration 008.
async function productMaster(db, date) {
  const { rows } = await db.query(
    `SELECT prodcode, description, unit, unitprice::text AS unitprice
       FROM products_priced_as_of($1::date)
      ORDER BY prodcode`,
    [date]
  );
  return rows;
}

const EMPLOYEE_COLUMNS = `empno, lastname, firstname, gender, to_char(hiredate, 'YYYY-MM-DD') AS hiredate, to_char(sepdate, 'YYYY-MM-DD') AS sepdate`;

// Employed on `date`: no separation date, or one after that date. No salary column is read here.
async function activeEmployees(db, date) {
  const { rows } = await db.query(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employee_active
      WHERE sepdate IS NULL OR sepdate > $1::date
      ORDER BY lower(lastname), lower(firstname), empno`,
    [date]
  );
  return rows;
}

// Every live employee, separated or not. No salary column is read here.
async function allEmployees(db) {
  const { rows } = await db.query(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employee_active ORDER BY lower(lastname), lower(firstname), empno`
  );
  return rows;
}

async function employeeChoices(db) {
  const { rows } = await db.query('SELECT empno, lastname, firstname FROM employee_active ORDER BY lower(lastname), lower(firstname), empno');
  return rows;
}

async function findEmployee(db, empno) {
  const { rows } = await db.query('SELECT empno, lastname, firstname FROM employee_active WHERE empno = $1', [empno]);
  return rows[0] || null;
}

// Live history rows of one employee, newest first. This is the only report query that reads salary.
async function jobHistory(db, empno) {
  const { rows } = await db.query(
    `SELECT h.empno, to_char(h.effdate, 'YYYY-MM-DD') AS effdate, h.jobcode, j.jobdesc, h.deptcode, d.deptname, h.salary::text AS salary
       FROM jobhistory_active h
       LEFT JOIN job j ON j.jobcode = h.jobcode
       LEFT JOIN department d ON d.deptcode = h.deptcode
      WHERE h.empno = $1
      ORDER BY h.effdate DESC, h.jobcode ASC`,
    [empno]
  );
  return rows;
}

module.exports = { productMaster, activeEmployees, allEmployees, employeeChoices, findEmployee, jobHistory };
