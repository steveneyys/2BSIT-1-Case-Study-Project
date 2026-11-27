'use strict';

// All SQL for the sales header (S4-DEV-01). Key: transno (TR + 6 digits).
// Dates come back as text (to_char). The sale total is worked out here from the active lines and the price in force
// on the SALE date (price_as_of, migration 008): quantity x unit price. A line with no price on that date adds nothing
// to the total and is counted in `unpriced`, so the screen can say the total is incomplete instead of guessing.

const escapeLike = (text) => text.replace(/[\\%_]/g, '\\$&');

// Sort choices are mapped to fixed SQL text; nothing the browser sends is put into the query.
const SORTS = {
  transno: ['s.transno'],
  date: ['s.salesdate'],
  customer: ['lower(c.custname)', 's.custno'],
  employee: ['lower(e.lastname)', 'lower(e.firstname)', 's.empno'],
};

// scope: 'active' (hides deleted sales), 'deleted' or 'all' (Admin screens only).
const SCOPES = { active: 'AND NOT s.is_deleted', deleted: 'AND s.is_deleted', all: '' };

async function listSales(db, { search, scope = 'active', sort, dir, limit, offset }) {
  const columns = SORTS[sort] || SORTS.transno;
  const direction = dir === 'desc' ? 'DESC' : 'ASC';
  const orderBy = columns.map((c) => `${c} ${direction} NULLS LAST`).join(', ');
  const like = search ? `%${escapeLike(search)}%` : null;
  const { rows } = await db.query(
    `WITH page AS (
       SELECT s.transno, to_char(s.salesdate, 'YYYY-MM-DD') AS salesdate, s.salesdate AS sd, s.custno, c.custname,
              s.empno, e.lastname, e.firstname, s.is_deleted, s.stamp,
              count(*) OVER () AS total_rows,
              row_number() OVER (ORDER BY ${orderBy}, s.transno ASC) AS ord
         FROM sales s
         LEFT JOIN customer c ON c.custno = s.custno
         LEFT JOIN employee e ON e.empno = s.empno
        WHERE ($1::text IS NULL OR s.transno ILIKE $1 OR s.custno ILIKE $1 OR c.custname ILIKE $1 OR s.empno ILIKE $1
               OR e.lastname ILIKE $1 OR e.firstname ILIKE $1
               OR (coalesce(e.firstname, '') || ' ' || coalesce(e.lastname, '')) ILIKE $1)
          ${SCOPES[scope] ?? SCOPES.active}
        ORDER BY ${orderBy}, s.transno ASC
        LIMIT $2 OFFSET $3)
     SELECT p.transno, p.salesdate, p.custno, p.custname, p.empno, p.lastname, p.firstname, p.is_deleted, p.stamp, p.total_rows,
            t.total, t.lines, t.unpriced
       FROM page p
       CROSS JOIN LATERAL (
         SELECT coalesce(sum(d.quantity * price_as_of(d.prodcode, p.sd)), 0) AS total,
                count(*) AS lines,
                count(*) FILTER (WHERE price_as_of(d.prodcode, p.sd) IS NULL) AS unpriced
           FROM salesdetail_active d WHERE d.transno = p.transno) t
      ORDER BY p.ord`,
    [like, limit, offset]
  );
  return rows;
}

// Numbers for the Active / Inactive / All tabs (whole table, not narrowed by the search box).
async function countSales(db) {
  const { rows } = await db.query(
    'SELECT count(*) FILTER (WHERE NOT is_deleted) AS active, count(*) FILTER (WHERE is_deleted) AS deleted, count(*) AS total FROM sales'
  );
  return { active: Number(rows[0].active), deleted: Number(rows[0].deleted), all: Number(rows[0].total) };
}

const HEADER = `SELECT s.transno, to_char(s.salesdate, 'YYYY-MM-DD') AS salesdate, s.custno, c.custname, s.empno, e.lastname, e.firstname,
       s.is_deleted, s.stamp
  FROM sales s
  LEFT JOIN customer c ON c.custno = s.custno
  LEFT JOIN employee e ON e.empno = s.empno`;

// The sale with this number, deleted or not (the service decides who may see a deleted one).
async function findSale(db, transno) {
  const { rows } = await db.query(`${HEADER} WHERE s.transno = $1`, [transno]);
  return rows[0] || null;
}

async function findCustomer(db, custno) {
  const { rows } = await db.query('SELECT custno, custname FROM customer_active WHERE custno = $1', [custno]);
  return rows[0] || null;
}

async function findEmployee(db, empno) {
  const { rows } = await db.query(
    `SELECT empno, lastname, firstname, to_char(hiredate, 'YYYY-MM-DD') AS hiredate, to_char(sepdate, 'YYYY-MM-DD') AS sepdate
       FROM employee_active WHERE empno = $1`,
    [empno]
  );
  return rows[0] || null;
}

// Choices for the two drop-downs (live rows only).
async function listOptions(db) {
  const [customers, employees] = await Promise.all([
    db.query('SELECT custno AS code, custname AS name FROM customer_active ORDER BY lower(custname), custno'),
    db.query(
      `SELECT empno, lastname, firstname, to_char(hiredate, 'YYYY-MM-DD') AS hiredate, to_char(sepdate, 'YYYY-MM-DD') AS sepdate
         FROM employee_active ORDER BY lower(lastname), lower(firstname), empno`
    ),
  ]);
  return { customers: customers.rows, employees: employees.rows };
}

// Two people adding a sale at the same moment take turns, so they cannot be given the same number.
async function lockNumbering(client) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('sales:transno'))");
}

// The next free number: one more than the highest TR number ever used (deleted sales keep their number).
async function nextTransNo(client) {
  const { rows } = await client.query(
    "SELECT coalesce(max(substr(transno, 3)::int), 0) + 1 AS next FROM sales WHERE transno ~ '^TR[0-9]{6}$'"
  );
  const next = Number(rows[0].next);
  if (next > 999999) return null;
  return `TR${String(next).padStart(6, '0')}`;
}

async function insertSale(client, transno, v) {
  await client.query('INSERT INTO sales (transno, salesdate, custno, empno) VALUES ($1, $2, $3, $4)', [transno, v.salesdate, v.custno, v.empno]);
  return findSale(client, transno);
}

// Only live sales can be edited; the number never changes. null if missing or deleted.
async function updateSale(client, transno, v) {
  const { rowCount } = await client.query(
    'UPDATE sales SET salesdate = $2, custno = $3, empno = $4 WHERE transno = $1 AND NOT is_deleted',
    [transno, v.salesdate, v.custno, v.empno]
  );
  return rowCount ? findSale(client, transno) : null;
}

// Active lines of a sale that have no price on `date`: moving the sale to that date would leave them unpriced.
async function countLinesUnpricedOn(db, transno, date) {
  const { rows } = await db.query(
    `SELECT count(*) AS lines, count(*) FILTER (WHERE price_as_of(prodcode, $2::date) IS NULL) AS unpriced
       FROM salesdetail_active WHERE transno = $1`,
    [transno, date]
  );
  return { lines: Number(rows[0].lines), unpriced: Number(rows[0].unpriced) };
}

module.exports = {
  listSales, countSales, findSale, findCustomer, findEmployee, listOptions, lockNumbering, nextTransNo,
  insertSale, updateSale, countLinesUnpricedOn, escapeLike, SORTS,
};
