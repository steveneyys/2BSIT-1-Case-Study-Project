'use strict';

// Read-only SQL for the balance views (S4-DEV-06). Nothing here writes. Dates come back as text (to_char).
// Balance of a sale = its total minus its ACTIVE payments. The total is the active lines x the price in force on the SALE
// date (price_as_of), the same rule as the Sales screen. Inactive payments and deleted lines are never counted.

const FIGURES = `SELECT s.transno, to_char(s.salesdate, 'YYYY-MM-DD') AS salesdate, s.custno, c.custname, s.is_deleted,
       t.total::text AS total, t.unpriced, pay.paid::text AS paid
  FROM sales s
  LEFT JOIN customer c ON c.custno = s.custno
  CROSS JOIN LATERAL (
    SELECT coalesce(sum(d.quantity * price_as_of(d.prodcode, s.salesdate)), 0) AS total,
           count(*) FILTER (WHERE price_as_of(d.prodcode, s.salesdate) IS NULL) AS unpriced
      FROM salesdetail_active d WHERE d.transno = s.transno) t
  CROSS JOIN LATERAL (
    SELECT coalesce(sum(amount), 0) AS paid FROM payment_active WHERE transno = s.transno) pay`;

// One sale with its total, unpriced line count and paid amount (deleted or not; the service decides who may see a deleted one).
async function findSaleFigures(db, transno) {
  const { rows } = await db.query(`${FIGURES} WHERE s.transno = $1`, [transno]);
  return rows[0] || null;
}

// The payments of one sale, newest first. Users get active payments only; Admins can also ask for the inactive ones.
async function listSalePayments(db, transno, { includeDeleted = false } = {}) {
  const { rows } = await db.query(
    `SELECT orno, to_char(paydate, 'YYYY-MM-DD') AS paydate, amount::text AS amount, is_deleted
       FROM payment
      WHERE transno = $1 ${includeDeleted ? '' : 'AND NOT is_deleted'}
      ORDER BY paydate DESC, orno DESC`,
    [transno]
  );
  return rows;
}

async function findCustomer(db, custno) {
  const { rows } = await db.query('SELECT custno, custname, is_deleted FROM customer WHERE custno = $1', [custno]);
  return rows[0] || null;
}

// Every live sale of a customer with its figures, newest first.
async function listCustomerSales(db, custno) {
  const { rows } = await db.query(
    `${FIGURES} WHERE s.custno = $1 AND NOT s.is_deleted ORDER BY s.salesdate DESC, s.transno DESC`,
    [custno]
  );
  return rows;
}

module.exports = { findSaleFigures, listSalePayments, findCustomer, listCustomerSales };
