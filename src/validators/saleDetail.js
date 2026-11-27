'use strict';

const PROD_RE = /^[A-Z0-9]{1,6}$/; // prodCode VARCHAR(6)
const MAX_QTY = 99999999; // quantity DECIMAL(10,2); whole numbers only

// Quantity arrives as text from the form (or a number from another client). Returns { value: 5 } or { error }.
function parseQuantity(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { error: 'Enter the quantity.' };
  if (!/^-?\d+(\.\d+)?$/.test(text)) return { error: 'Enter the quantity as a whole number, for example 5.' };
  if (text.startsWith('-')) return { error: 'Quantity cannot be negative.' };
  if (!/^\d+$/.test(text)) return { error: 'Quantity must be a whole number.' };
  const n = Number(text);
  if (n < 1) return { error: 'Quantity must be at least 1.' };
  if (n > MAX_QTY) return { error: 'Quantity is too large. The maximum is 99,999,999.' };
  return { value: n };
}

// Checks the shape of one sale line. Whether the product exists and has a price is checked by the service.
// The transaction number comes from the address, never from the body.
function validateLine(body = {}) {
  const errors = {};
  const prodcode = String(body.prodcode ?? '').trim().toUpperCase();
  const qty = parseQuantity(body.quantity);

  if (!prodcode) errors.prodcode = 'Choose the product.';
  else if (!PROD_RE.test(prodcode)) errors.prodcode = 'Choose an existing product.';
  if (qty.error) errors.quantity = qty.error;

  return { errors, value: { prodcode, quantity: qty.value ?? null } };
}

module.exports = { validateLine, parseQuantity, PROD_RE, MAX_QTY };
