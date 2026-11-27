'use strict';

const { parseDate, manilaToday } = require('./employee');

const CUST_RE = /^[A-Z0-9]{1,5}$/; // custNo VARCHAR(5)
const EMP_RE = /^\d{5}$/; // empNo VARCHAR(5), digits only
const TRANS_RE = /^TR\d{6}$/; // transNo VARCHAR(8): TR + 6 digits, assigned by the system

// Checks the shape of a sale header. Whether the customer and employee exist is checked by the service.
// The transaction number is never taken from the body: the system assigns it on Add and it cannot change.
function validateSale(body = {}, { today = manilaToday() } = {}) {
  const errors = {};
  const date = parseDate(body.salesdate);
  const custno = String(body.custno ?? '').trim().toUpperCase();
  const empno = String(body.empno ?? '').trim();

  if (date === '') errors.salesdate = 'Enter the sales date.';
  else if (date === null) errors.salesdate = 'Enter a real date as YYYY-MM-DD.';
  else if (date > today) errors.salesdate = 'The sales date cannot be in the future.';

  if (!custno) errors.custno = 'Choose the customer.';
  else if (!CUST_RE.test(custno)) errors.custno = 'Choose an existing customer.';

  if (!empno) errors.empno = 'Choose the salesperson.';
  else if (!EMP_RE.test(empno)) errors.empno = 'Choose an existing employee.';

  return { errors, value: { salesdate: date || null, custno, empno } };
}

module.exports = { validateSale, CUST_RE, EMP_RE, TRANS_RE };
