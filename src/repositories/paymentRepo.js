'use strict';

// All SQL for payments (S4-DEV-03). Key: orno. Dates come back as text (to_char).
// A sale's balance = its total (active lines x the price on the SALE date, as on the Sales screen) minus its ACTIVE payments.
// Inactive payments are not part of the balance.

const escapeLike = (text) => text.replace(/[\\%_]/g, '\\$&');

const SORTS = {
  orno: ['p.orno'],
  date: ['p.paydate'],
  sale: ['p.transno'],
  amount: ['p.amount'],
};
const SCOPES = { active: 'AND NOT p.is_deleted', deleted: 'AND p.is_deleted', all: '' };

async function listPayments(db, { search, scope = 'active', sort, dir, limit, offset }) {
  const columns = SORTS[sort] || SORTS.orno;
  const direction = dir === 'desc' ? 'DESC' : 'ASC';
  const orderBy = columns.map((c) => `${c} ${direction} NULLS LAST`).join(', ');
  const like = search ? `%${escapeLike(search)}%` : null;
  const { rows } = await db.query(
    `SELECT p.orno, to_char(p.paydate, 'YYYY-MM-DD') AS paydate, p.amount::text AS amount, p.transno, s.custno, c.custname,
            p.is_deleted, p.stamp, count(*) OVER () AS total_rows
       FROM payment p
       LEFT JOIN sales s ON s.transno = p.transno
       LEFT JOIN customer c ON c.custno = s.custno
      WHERE ($1::text IS NULL OR p.orno ILIKE $1 OR p.transno ILIKE $1 OR s.custno ILIKE $1 OR c.custname ILIKE $1)
        ${SCOPES[scope] ?? SCOPES.active}
      ORDER BY ${orderBy}, p.orno ASC
      LIMIT $2 OFFSET $3`,
    [like, limit, offset]
  );
  return rows;
}

async function countPayments(db) {
  const { rows } = await db.query(
    'SELECT count(*) FILTER (WHERE NOT is_deleted) AS active, count(*) FILTER (WHERE is_deleted) AS deleted, count(*) AS total FROM payment'
  );
  return { active: Number(rows[0].active), deleted: Number(rows[0].deleted), all: Number(rows[0].total) };
}

// Total, unpriced line count and paid amount of live sales. One sale (`transno`) or, with a search, the best matches.
const BALANCE_SELECT = `SELECT s.transno, to_char(s.salesdate, 'YYYY-MM-DD') AS salesdate, s.custno, c.custname,
       t.total::text AS total, t.unpriced, pay.paid::text AS paid
  FROM sales_active s
  LEFT JOIN customer c ON c.custno = s.custno
  CROSS JOIN LATERAL (
    SELECT coalesce(sum(d.quantity * price_as_of(d.prodcode, s.salesdate)), 0) AS total,
           count(*) FILTER (WHERE price_as_of(d.prodcode, s.salesdate) IS NULL) AS unpriced
      FROM salesdetail_active d WHERE d.transno = s.transno) t
  CROSS JOIN LATERAL (
    SELECT coalesce(sum(amount), 0) AS paid FROM payment_active WHERE transno = s.transno) pay`;

async function findSaleBalance(db, transno) {
  const { rows } = await db.query(`${BALANCE_SELECT} WHERE s.transno = $1`, [transno]);
  return rows[0] || null;
}

// Drop-down choices: live sales that still owe money, newest first. `search` narrows by number or customer.
async function listPayableSales(db, { search, limit }) {
  const like = search ? `%${escapeLike(search)}%` : null;
  const { rows } = await db.query(
    `SELECT * FROM (${BALANCE_SELECT}
       WHERE ($1::text IS NULL OR s.transno ILIKE $1 OR s.custno ILIKE $1 OR c.custname ILIKE $1)) b
      WHERE b.total::numeric - b.paid::numeric > 0
      ORDER BY b.transno DESC
      LIMIT $2`,
    [like, limit]
  );
  return rows;
}

// Any payment with this receipt number, deleted or not (a deleted payment keeps its number).
async function findAnyPayment(db, orno) {
  const { rows } = await db.query('SELECT orno, is_deleted FROM payment WHERE orno = $1', [orno]);
  return rows[0] || null;
}

// The next receipt number to suggest: one more than the highest OR + 6 digits ever used. A suggestion, not a reservation.
async function suggestOrNo(db) {
  const { rows } = await db.query("SELECT coalesce(max(substr(orno, 3)::int), 0) + 1 AS next FROM payment WHERE orno ~ '^OR[0-9]{6}$'");
  const next = Number(rows[0].next);
  return next > 999999 ? null : `OR${String(next).padStart(6, '0')}`;
}

// Two people paying the same sale at the same moment take turns, so the balance check cannot be beaten by a race.
async function lockSalePayments(client, transno) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('payment:' || $1))", [transno]);
}

async function insertPayment(client, v) {
  const { rows } = await client.query(
    `INSERT INTO payment (orno, paydate, amount, transno) VALUES ($1, $2, $3, $4)
     RETURNING orno, to_char(paydate, 'YYYY-MM-DD') AS paydate, amount::text AS amount, transno`,
    [v.orno, v.paydate, v.amount, v.transno]
  );
  return rows[0];
}

module.exports = {
  listPayments, countPayments, findSaleBalance, listPayableSales, findAnyPayment, suggestOrNo, lockSalePayments, insertPayment, escapeLike, SORTS,
};
