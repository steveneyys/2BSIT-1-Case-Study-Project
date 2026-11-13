'use strict';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const PRICE_RE = /^\d{1,8}(\.\d{1,2})?$/; // DECIMAL(10,2): up to 8 digits before the point, 2 after
const MIN_YEAR = 1990;
const MAX_YEAR = 2100;

// A real calendar date written YYYY-MM-DD (2026-02-30 is refused), or null.
function parseDate(text) {
  const m = DATE_RE.exec(String(text ?? '').trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function validatePrice(body = {}, { needDate = false } = {}) {
  const errors = {};
  const value = {};

  if (needDate) {
    const raw = String(body.effdate ?? '').trim();
    const date = parseDate(raw);
    if (!raw) errors.effdate = 'Choose the effective date.';
    else if (!date) errors.effdate = 'Enter a real date (YYYY-MM-DD).';
    else if (Number(date.slice(0, 4)) < MIN_YEAR || Number(date.slice(0, 4)) > MAX_YEAR) errors.effdate = `Use a year between ${MIN_YEAR} and ${MAX_YEAR}.`;
    else value.effdate = date;
  }

  const price = String(body.price ?? '').trim();
  if (!price) errors.price = 'Enter the unit price.';
  else if (!PRICE_RE.test(price)) errors.price = 'Use numbers only, up to 8 digits and 2 decimals (for example 1250.50).';
  else if (Number(price) <= 0) errors.price = 'The price must be greater than zero.';
  else value.price = Number(price).toFixed(2);

  return { errors, value };
}

module.exports = { validatePrice, parseDate };
