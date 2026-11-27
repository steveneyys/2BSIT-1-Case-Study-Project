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

// ---- Ranked sales reports (S4-DEV-05) ----
// Sales in the period: live sales dated From..To, their live lines, each priced as of the SALE date (price_as_of), as on the
// Sales screen. A line with no price on its sale date has no amount; it is left out and counted, never guessed.
const LINES = `WITH lines AS (
  SELECT s.transno, s.salesdate, s.custno, d.prodcode, d.quantity, price_as_of(d.prodcode, s.salesdate) AS price
    FROM sales_active s
    JOIN salesdetail_active d ON d.transno = s.transno
   WHERE s.salesdate BETWEEN $1::date AND $2::date)`;

async function topCustomers(db, { from, to, topn }) {
  const { rows } = await db.query(
    `${LINES}
     SELECT l.custno, c.custname, sum(l.quantity * l.price)::text AS amount
       FROM lines l LEFT JOIN customer c ON c.custno = l.custno
      WHERE l.price IS NOT NULL
      GROUP BY l.custno, c.custname
     HAVING sum(l.quantity * l.price) > 0
      ORDER BY sum(l.quantity * l.price) DESC, l.custno ASC
      LIMIT $3`,
    [from, to, topn]
  );
  return rows;
}

async function topProducts(db, { from, to, topn }) {
  const { rows } = await db.query(
    `${LINES}
     SELECT l.prodcode, p.description, sum(l.quantity)::text AS quantity, sum(l.quantity * l.price)::text AS amount
       FROM lines l LEFT JOIN product p ON p.prodcode = l.prodcode
      WHERE l.price IS NOT NULL
      GROUP BY l.prodcode, p.description
     HAVING sum(l.quantity * l.price) > 0
      ORDER BY sum(l.quantity * l.price) DESC, l.prodcode ASC
      LIMIT $3`,
    [from, to, topn]
  );
  return rows;
}

async function topSales(db, { from, to, topn }) {
  const { rows } = await db.query(
    `${LINES}
     SELECT l.transno, to_char(l.salesdate, 'YYYY-MM-DD') AS salesdate, l.custno, c.custname, sum(l.quantity * l.price)::text AS amount
       FROM lines l LEFT JOIN customer c ON c.custno = l.custno
      WHERE l.price IS NOT NULL
      GROUP BY l.transno, l.salesdate, l.custno, c.custname
     HAVING sum(l.quantity * l.price) > 0
      ORDER BY sum(l.quantity * l.price) DESC, l.transno ASC
      LIMIT $3`,
    [from, to, topn]
  );
  return rows;
}

// Lines in the period that have no price on their sale date (left out of the three reports above).
async function unpricedLines(db, { from, to }) {
  const { rows } = await db.query(`${LINES} SELECT count(*) AS n FROM lines WHERE price IS NULL`, [from, to]);
  return Number(rows[0].n);
}

module.exports = { topCustomers, topProducts, topSales, unpricedLines, productMaster, activeEmployees, allEmployees, employeeChoices, findEmployee, jobHistory };
