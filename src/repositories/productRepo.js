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
async function listProducts(db, { search, unit, sort, dir, limit, offset }) {
  const column = SORTS[sort] || SORTS.description;
  const direction = dir === 'desc' ? 'DESC' : 'ASC';
  const like = search ? `%${escapeLike(search)}%` : null;
  const { rows } = await db.query(
    `SELECT p.prodcode, p.description, p.unit, cp.unitprice, to_char(cp.effdate, 'YYYY-MM-DD') AS effdate,
            count(*) OVER () AS total
     FROM product_active p
     LEFT JOIN LATERAL (
        SELECT h.unitprice, h.effdate
        FROM pricehist h
        WHERE h.prodcode = p.prodcode AND NOT h.is_deleted AND h.effdate <= (now() AT TIME ZONE 'Asia/Manila')::date
        ORDER BY h.effdate DESC
        LIMIT 1
     ) cp ON TRUE
     WHERE ($1::text IS NULL OR p.prodcode ILIKE $1 OR p.description ILIKE $1)
       AND ($2::text IS NULL OR p.unit = $2)
     ORDER BY ${column} ${direction} NULLS LAST, p.prodcode ASC
     LIMIT $3 OFFSET $4`,
    [like, unit || null, limit, offset]
  );
  return rows;
}

module.exports = { listProducts, escapeLike, SORTS };
