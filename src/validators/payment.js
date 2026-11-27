'use strict';

const { parseDate, manilaToday } = require('./employee');

const ORNO_RE = /^[A-Z0-9]{1,8}$/; // orNo VARCHAR(8)
const AUTO_ORNO_RE = /^OR\d{6}$/; // the numbers the screen suggests: OR + 6 digits
const TRANS_RE = /^TR\d{6}$/;
const MAX_AMOUNT = 99999999.99; // amount DECIMAL(10,2)

// Amount arrives as text from the form. Returns { value: '1500.50' } or { error }.
function parseAmount(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { error: 'Enter the payment amount.' };
  if (!/^-?\d+(\.\d+)?$/.test(text)) return { error: 'Enter the amount as a number, for example 1500.50.' };
  if (text.startsWith('-')) return { error: 'The payment amount cannot be negative.' };
  if ((text.split('.')[1] || '').length > 2) return { error: 'Use at most 2 decimal places.' };
  if (Number(text) === 0) return { error: 'The payment amount must be more than 0.' };
  if (Number(text) > MAX_AMOUNT) return { error: 'The amount is too large. The maximum is 99,999,999.99.' };
  return { value: Number(text).toFixed(2) };
}

// Checks the shape of a payment. Whether the sale exists and has enough balance is checked by the service.
function validatePayment(body = {}, { today = manilaToday() } = {}) {
  const errors = {};
  const orno = String(body.orno ?? '').trim().toUpperCase();
  const date = parseDate(body.paydate);
  const transno = String(body.transno ?? '').trim().toUpperCase();
  const amount = parseAmount(body.amount);

  if (!orno) errors.orno = 'Enter the official receipt number.';
  else if (!ORNO_RE.test(orno)) errors.orno = 'Use 1 to 8 letters or digits, for example OR000125.';

  if (date === '') errors.paydate = 'Enter the payment date.';
  else if (date === null) errors.paydate = 'Enter a real date as YYYY-MM-DD.';
  else if (date > today) errors.paydate = 'The payment date cannot be in the future.';

  if (amount.error) errors.amount = amount.error;

  if (!transno) errors.transno = 'Choose the sale this payment is for.';
  else if (!TRANS_RE.test(transno)) errors.transno = 'Choose an existing sale.';

  return { errors, value: { orno, paydate: date || null, amount: amount.value ?? null, transno } };
}

module.exports = { validatePayment, parseAmount, ORNO_RE, AUTO_ORNO_RE, TRANS_RE, MAX_AMOUNT };
