'use strict';

const UNITS = ['pc', 'ea', 'mtr', 'pkg', 'ltr']; // unit_ck in the database
const CODE_RE = /^[A-Z]{2}[0-9]{4}$/;            // two letters for the category, four digits (AD0001, MP0004)

// Limits match the database columns: prodcode VARCHAR(6), description VARCHAR(30), unit in unit_ck.
// `needCode` is true on Add (the person types the code); on Edit the code comes from the address, never the body.
function validateProduct(body = {}, { needCode = false } = {}) {
  const errors = {};
  const code = String(body.code ?? '').trim().toUpperCase();
  const description = String(body.description ?? '').trim();
  const unit = String(body.unit ?? '').trim().toLowerCase();

  if (needCode) {
    if (!code) errors.code = 'Enter the product code.';
    else if (!CODE_RE.test(code)) errors.code = 'Use two letters and four digits, for example AD0001.';
  }

  if (!description) errors.description = 'Enter the product description.';
  else if (description.length > 30) errors.description = 'Description must be 30 characters or fewer.';

  if (!unit) errors.unit = 'Choose a unit.';
  else if (!UNITS.includes(unit)) errors.unit = 'Choose pc, ea, mtr, pkg or ltr.';

  return { errors, value: { ...(needCode ? { code } : {}), description, unit } };
}

module.exports = { validateProduct, UNITS, CODE_RE };
