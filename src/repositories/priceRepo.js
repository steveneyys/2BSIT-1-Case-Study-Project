'use strict';

// All SQL for price history (S2-DEV-07). Table pricehist: effdate, prodcode, unitprice, is_deleted, stamp; key (effdate, prodcode).
// The date is read back as text (to_char) so no time-zone shifting happens in node-pg or the browser.
// "Today" is the Manila business day, the same clock as the product list and the Stamp column.

const COLS = `to_char(effdate, 'YYYY-MM-DD') AS effdate, unitprice`;

// Newest first. in_effect = the date has arrived (a later date is only "scheduled").
async function listPrices(db, prodcode) {
  const { rows } = await db.query(
    `SELECT ${COLS}, stamp, effdate <= (now() AT TIME ZONE 'Asia/Manila')::date AS in_effect
     FROM pricehist_active WHERE prodcode = $1 ORDER BY effdate DESC`,
    [prodcode]
  );
  return rows;
}

// Looks at the table itself so Add can revive a deleted row for the same date instead of hitting the primary key.
async function findAnyPrice(db, prodcode, effdate) {
  const { rows } = await db.query(
    'SELECT is_deleted FROM pricehist WHERE prodcode = $1 AND effdate = $2::date',
    [prodcode, effdate]
  );
  return rows[0] || null;
}

async function insertPrice(client, prodcode, effdate, price) {
  const { rows } = await client.query(
    `INSERT INTO pricehist (effdate, prodcode, unitprice) VALUES ($1::date, $2, $3) RETURNING ${COLS}`,
    [effdate, prodcode, price]
  );
  return rows[0];
}

async function reviveAndSetPrice(client, prodcode, effdate, price) {
  const { rows } = await client.query(
    `UPDATE pricehist SET is_deleted = false, unitprice = $3
     WHERE prodcode = $1 AND effdate = $2::date AND is_deleted RETURNING ${COLS}`,
    [prodcode, effdate, price]
  );
  return rows[0] || null;
}

// Only the price changes; the date is part of the key (and of the audit trail), so a wrong date is deleted and added again.
async function updatePrice(client, prodcode, effdate, price) {
  const { rows } = await client.query(
    `UPDATE pricehist SET unitprice = $3 WHERE prodcode = $1 AND effdate = $2::date AND NOT is_deleted RETURNING ${COLS}`,
    [prodcode, effdate, price]
  );
  return rows[0] || null;
}

async function softDeletePrice(client, prodcode, effdate) {
  const { rows } = await client.query(
    `UPDATE pricehist SET is_deleted = true WHERE prodcode = $1 AND effdate = $2::date AND NOT is_deleted RETURNING ${COLS}`,
    [prodcode, effdate]
  );
  return rows[0] || null;
}

module.exports = { listPrices, findAnyPrice, insertPrice, reviveAndSetPrice, updatePrice, softDeletePrice };
