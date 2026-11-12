'use strict';

// All SQL for the customer module. Reads go through customer_active (soft-deleted rows excluded).
// Real schema: db/migrations/001_hope_base.sql (customer: custno, custname, address, payterm) and
// 007_customer_product_indexes.sql (search / filter / sort indexes).

// User-typed text goes into ILIKE: escape the wildcard characters so "50%" searches for "50%".
const escapeLike = (text) => text.replace(/[\\%_]/g, '\\$&');

// Sort choices are mapped to fixed SQL text here; nothing the browser sends is ever put into the query.
const SORTS = {
  name: 'lower(custname)',
  code: 'custno',
  term: 'payterm',
};

// scope: 'active' (the view, which hides deleted rows), 'deleted' or 'all' (the table itself; Admin screens only).
const SCOPES = { active: '', deleted: 'AND is_deleted', all: '' };

async function listCustomers(db, { search, payterm, scope = 'active', sort, dir, limit, offset }) {
  const column = SORTS[sort] || SORTS.name;
  const direction = dir === 'desc' ? 'DESC' : 'ASC';
  const like = search ? `%${escapeLike(search)}%` : null;
  const { rows } = await db.query(
    `SELECT custno, custname, address, payterm, is_deleted, stamp, count(*) OVER () AS total
     FROM ${scope === 'active' || !Object.hasOwn(SCOPES, scope) ? 'customer_active' : 'customer'}
     WHERE ($1::text IS NULL OR custno ILIKE $1 OR custname ILIKE $1 OR address ILIKE $1)
       AND ($2::text IS NULL OR payterm = $2)
       ${Object.hasOwn(SCOPES, scope) ? SCOPES[scope] : ''}
     ORDER BY ${column} ${direction}, custno ASC
     LIMIT $3 OFFSET $4`,
    [like, payterm || null, limit, offset]
  );
  return rows;
}

const COLUMNS = 'custno, custname, address, payterm';

async function findCustomer(db, custno) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM customer_active WHERE custno = $1`, [custno]);
  return rows[0] || null;
}

// Makes the next code (C0001, C0002, ...). Looks at ALL rows, deleted ones too, so a code is never reused.
// The advisory lock makes two people adding at the same moment take turns instead of getting the same code.
// Must run inside a transaction (the lock lasts until COMMIT).
async function insertCustomer(client, { name, address, payterm }) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('customer_code'))");
  const { rows: next } = await client.query(
    "SELECT COALESCE(MAX(substr(custno, 2)::int), 0) + 1 AS n FROM customer WHERE custno ~ '^C[0-9]{4}$'"
  );
  const n = Number(next[0].n);
  if (n > 9999) {
    const err = new Error('Customer codes are used up.');
    err.code = 'CODE_EXHAUSTED';
    throw err;
  }
  const { rows } = await client.query(
    `INSERT INTO customer (custno, custname, address, payterm) VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
    [`C${String(n).padStart(4, '0')}`, name, address, payterm]
  );
  return rows[0];
}

// Only live rows can be edited; the code never changes. Returns null if the customer is missing or deleted.
async function updateCustomer(client, custno, { name, address, payterm }) {
  const { rows } = await client.query(
    `UPDATE customer SET custname = $2, address = $3, payterm = $4
     WHERE custno = $1 AND NOT is_deleted RETURNING ${COLUMNS}`,
    [custno, name, address, payterm]
  );
  return rows[0] || null;
}

// Numbers for the Active / Inactive / All tabs (whole table, not narrowed by the search box).
async function countCustomers(db) {
  const { rows } = await db.query(
    'SELECT count(*) FILTER (WHERE NOT is_deleted) AS active, count(*) FILTER (WHERE is_deleted) AS deleted, count(*) AS total FROM customer'
  );
  return { active: Number(rows[0].active), deleted: Number(rows[0].deleted), all: Number(rows[0].total) };
}

// Soft delete: the row stays, with is_deleted = true. The Stamp ("DELETE <name> <date>") is written by the database.
// The database also refuses if the customer still has active sales (trigger trg_check_children).
async function softDeleteCustomer(client, custno) {
  const { rows } = await client.query(
    `UPDATE customer SET is_deleted = true WHERE custno = $1 AND NOT is_deleted RETURNING ${COLUMNS}`,
    [custno]
  );
  return rows[0] || null;
}

async function restoreCustomer(client, custno) {
  const { rows } = await client.query(
    `UPDATE customer SET is_deleted = false WHERE custno = $1 AND is_deleted RETURNING ${COLUMNS}`,
    [custno]
  );
  return rows[0] || null;
}

async function countActiveSales(db, custno) {
  const { rows } = await db.query('SELECT count(*) AS n FROM sales_active WHERE custno = $1', [custno]);
  return Number(rows[0].n);
}

module.exports = {
  countCustomers, softDeleteCustomer, restoreCustomer, countActiveSales, listCustomers, findCustomer, insertCustomer, updateCustomer, escapeLike, SORTS };
