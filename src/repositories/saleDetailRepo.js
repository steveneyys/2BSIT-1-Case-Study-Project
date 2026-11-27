'use strict';

// All SQL for the sale lines (S4-DEV-02). Key: (transno, prodcode).
// There is no price column on a line. The unit price is the latest live price effective on or before the SALE date
// (price_as_of, migration 008), so it is worked out on every read and never stored.

const SELECT = `SELECT d.transno, d.prodcode, p.description, p.unit, d.quantity::text AS quantity,
       price_as_of(d.prodcode, s.salesdate)::text AS unitprice, d.is_deleted, d.stamp
  FROM salesdetail d
  JOIN sales s ON s.transno = d.transno
  LEFT JOIN product p ON p.prodcode = d.prodcode`;

// Oldest product code first. Users never get deleted lines; Admins ask for them.
async function listLines(db, transno, { includeDeleted = false } = {}) {
  const { rows } = await db.query(`${SELECT} WHERE d.transno = $1 ${includeDeleted ? '' : 'AND NOT d.is_deleted'} ORDER BY d.prodcode`, [transno]);
  return rows;
}

// Any line with this key, deleted or not.
async function findLine(db, transno, prodcode) {
  const { rows } = await db.query(`${SELECT} WHERE d.transno = $1 AND d.prodcode = $2`, [transno, prodcode]);
  return rows[0] || null;
}

// Another live line of this sale for the same product. `except` skips the line being edited.
async function findLiveLine(db, transno, prodcode, except = null) {
  const { rows } = await db.query(
    'SELECT prodcode FROM salesdetail_active WHERE transno = $1 AND prodcode = $2 AND ($3::text IS NULL OR prodcode <> $3) LIMIT 1',
    [transno, prodcode, except]
  );
  return rows[0] || null;
}

// Two people changing lines of one sale take turns, so the one-line-per-product check cannot be beaten by a race.
async function lockSale(client, transno) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('saledetail:' || $1))", [transno]);
}

// A live product and its price on `date` (null price = none in force on that date).
async function findProduct(db, prodcode, date) {
  const { rows } = await db.query(
    'SELECT prodcode, description, unit, price_as_of(prodcode, $2::date)::text AS unitprice FROM product_active WHERE prodcode = $1',
    [prodcode, date]
  );
  return rows[0] || null;
}

// Drop-down choices: every live product with its price on the sale date.
async function listProducts(db, date) {
  const { rows } = await db.query('SELECT prodcode, description, unit, unitprice::text AS unitprice FROM products_priced_as_of($1::date)', [date]);
  return rows;
}

async function insertLine(client, transno, v) {
  await client.query('INSERT INTO salesdetail (transno, prodcode, quantity) VALUES ($1, $2, $3)', [transno, v.prodcode, v.quantity]);
  return findLine(client, transno, v.prodcode);
}

// Only live lines can be edited. The product is part of the key, so it may change too. null if missing or deleted.
async function updateLine(client, transno, prodcode, v) {
  const { rowCount } = await client.query(
    'UPDATE salesdetail SET prodcode = $3, quantity = $4 WHERE transno = $1 AND prodcode = $2 AND NOT is_deleted',
    [transno, prodcode, v.prodcode, v.quantity]
  );
  return rowCount ? findLine(client, transno, v.prodcode) : null;
}

async function setDeleted(client, transno, prodcode, deleted) {
  const { rowCount } = await client.query(
    'UPDATE salesdetail SET is_deleted = $3 WHERE transno = $1 AND prodcode = $2 AND is_deleted = $4',
    [transno, prodcode, deleted, !deleted]
  );
  return rowCount ? findLine(client, transno, prodcode) : null;
}

const softDeleteLine = (client, transno, prodcode) => setDeleted(client, transno, prodcode, true);
const restoreLine = (client, transno, prodcode) => setDeleted(client, transno, prodcode, false);

module.exports = { listLines, findLine, findLiveLine, lockSale, findProduct, listProducts, insertLine, updateLine, softDeleteLine, restoreLine };
