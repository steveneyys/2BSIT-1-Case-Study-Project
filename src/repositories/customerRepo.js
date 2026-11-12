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

module.exports = { listCustomers, escapeLike, SORTS };
