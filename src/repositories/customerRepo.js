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

async function listCustomers(db, { search, payterm, sort, dir, limit, offset }) {
  const column = SORTS[sort] || SORTS.name;
  const direction = dir === 'desc' ? 'DESC' : 'ASC';
  const like = search ? `%${escapeLike(search)}%` : null;
  const { rows } = await db.query(
    `SELECT custno, custname, address, payterm, count(*) OVER () AS total
     FROM customer_active
     WHERE ($1::text IS NULL OR custno ILIKE $1 OR custname ILIKE $1 OR address ILIKE $1)
       AND ($2::text IS NULL OR payterm = $2)
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

module.exports = { listCustomers, findCustomer, insertCustomer, updateCustomer, escapeLike, SORTS };
