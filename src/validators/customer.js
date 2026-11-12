'use strict';

const PAYTERMS = ['COD', '30D', '45D'];

// Limits match the database columns: custname VARCHAR(20), address VARCHAR(50), payterm COD/30D/45D (pay_ck).
// The customer code is never read from the browser: the system makes it on Add and it cannot change on Edit.
function validateCustomer(body = {}) {
  const errors = {};
  const name = String(body.name ?? '').trim();
  const address = String(body.address ?? '').trim();
  const payterm = String(body.payterm ?? '').trim().toUpperCase();

  if (!name) errors.name = 'Enter the customer name.';
  else if (name.length > 20) errors.name = 'Customer name must be 20 characters or fewer.';

  if (address.length > 50) errors.address = 'Address must be 50 characters or fewer.';

  if (!payterm) errors.payterm = 'Choose a payment term.';
  else if (!PAYTERMS.includes(payterm)) errors.payterm = 'Choose COD, 30D or 45D.';

  return { errors, value: { name, address: address || null, payterm } };
}

module.exports = { validateCustomer, PAYTERMS };
