'use strict';

// All SQL for the product module. Reads go through product_active (soft-deleted rows excluded).
// Real schema: db/migrations/001_hope_base.sql (product: prodcode, description, unit; pricehist: prodcode, effdate, unitprice),
// 007 (search / unit indexes) and 008 (price-as-of-date rules).

const escapeLike = (text) => text.replace(/[\\%_]/g, '\\$&');

// Sort choices map to fixed SQL text; nothing the browser sends is ever put into the query.
const SORTS = {
  code: 'p.prodcode',
  description: 'lower(p.description)',
  unit: 'p.unit',
  price: 'cp.unitprice',
};

// "Today" is the business day in Manila, the same clock the Stamp column uses.
// to_char keeps the date as plain text, so no time-zone shifting happens in the browser or in node-pg.
// scope: 'active' (the view, which hides deleted rows), 'deleted' or 'all' (the table itself; Admin screens only).
const SCOPES = { active: '', deleted: 'AND p.is_deleted', all: '' };

async function listProducts(db, { search, unit, scope = 'active', sort, dir, limit, offset }) {
  const column = SORTS[sort] || SORTS.description;
  const direction = dir === 'desc' ? 'DESC' : 'ASC';
  const like = search ? `%${escapeLike(search)}%` : null;
  const { rows } = await db.query(
    `SELECT p.prodcode, p.description, p.unit, p.is_deleted, p.stamp, cp.unitprice, to_char(cp.effdate, 'YYYY-MM-DD') AS effdate,
            count(*) OVER () AS total
     FROM ${scope === 'active' || !Object.hasOwn(SCOPES, scope) ? 'product_active' : 'product'} p
     LEFT JOIN LATERAL (
        SELECT h.unitprice, h.effdate
        FROM pricehist h
        WHERE h.prodcode = p.prodcode AND NOT h.is_deleted AND h.effdate <= (now() AT TIME ZONE 'Asia/Manila')::date
        ORDER BY h.effdate DESC
        LIMIT 1
     ) cp ON TRUE
     WHERE ($1::text IS NULL OR p.prodcode ILIKE $1 OR p.description ILIKE $1)
       AND ($2::text IS NULL OR p.unit = $2)
       ${Object.hasOwn(SCOPES, scope) ? SCOPES[scope] : ''}
     ORDER BY ${column} ${direction} NULLS LAST, p.prodcode ASC
     LIMIT $3 OFFSET $4`,
    [like, unit || null, limit, offset]
  );
  return rows;
}

const COLUMNS = 'prodcode, description, unit';

async function findProduct(db, prodcode) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM product_active WHERE prodcode = $1`, [prodcode]);
  return rows[0] || null;
}

// Looks at the table itself (deleted rows too) so Add can tell "taken" from "taken by a deleted product".
async function findAnyProduct(db, prodcode) {
  const { rows } = await db.query('SELECT prodcode, is_deleted FROM product WHERE prodcode = $1', [prodcode]);
  return rows[0] || null;
}

async function insertProduct(client, { code, description, unit }) {
  const { rows } = await client.query(
    `INSERT INTO product (prodcode, description, unit) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
    [code, description, unit]
  );
  return rows[0];
}

// Only live rows can be edited; the code never changes. Returns null if the product is missing or deleted.
async function updateProduct(client, prodcode, { description, unit }) {
  const { rows } = await client.query(
    `UPDATE product SET description = $2, unit = $3 WHERE prodcode = $1 AND NOT is_deleted RETURNING ${COLUMNS}`,
    [prodcode, description, unit]
  );
  return rows[0] || null;
}

async function countProducts(db) {
  const { rows } = await db.query(
    'SELECT count(*) FILTER (WHERE NOT is_deleted) AS active, count(*) FILTER (WHERE is_deleted) AS deleted, count(*) AS total FROM product'
  );
  return { active: Number(rows[0].active), deleted: Number(rows[0].deleted), all: Number(rows[0].total) };
}

// Soft delete: the row stays, with is_deleted = true. The Stamp ("DELETE <name> <date>") is written by the database.
// The database also refuses while the product has active prices or sale lines (trigger trg_check_children).
async function softDeleteProduct(client, prodcode) {
  const { rows } = await client.query(
    `UPDATE product SET is_deleted = true WHERE prodcode = $1 AND NOT is_deleted RETURNING ${COLUMNS}`,
    [prodcode]
  );
  return rows[0] || null;
}

async function restoreProduct(client, prodcode) {
  const { rows } = await client.query(
    `UPDATE product SET is_deleted = false WHERE prodcode = $1 AND is_deleted RETURNING ${COLUMNS}`,
    [prodcode]
  );
  return rows[0] || null;
}

// What blocks a delete: prices and sale lines that are not deleted themselves.
async function countActiveChildren(db, prodcode) {
  const { rows } = await db.query(
    `SELECT (SELECT count(*) FROM pricehist WHERE prodcode = $1 AND NOT is_deleted) AS prices,
            (SELECT count(*) FROM salesdetail WHERE prodcode = $1 AND NOT is_deleted) AS lines`,
    [prodcode]
  );
  return { prices: Number(rows[0].prices), lines: Number(rows[0].lines) };
}

module.exports = { countProducts, softDeleteProduct, restoreProduct, countActiveChildren, findProduct, findAnyProduct, insertProduct, updateProduct, listProducts, escapeLike, SORTS };
