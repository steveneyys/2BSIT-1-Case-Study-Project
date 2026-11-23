'use strict';

const CODE_RE = /^[A-Z0-9]{2,3}$/; // deptCode VARCHAR(3); existing codes are ACT, BR1, EXC, HRD, IT, PAY, WHS

// Limits match the database columns: deptCode VARCHAR(3), deptName VARCHAR(20).
// `needCode` is true on Add (the person types the code); on Edit the code comes from the address, never the body.
function validateDepartment(body = {}, { needCode = false } = {}) {
  const errors = {};
  const code = String(body.code ?? '').trim().toUpperCase();
  const name = String(body.name ?? '').trim();

  if (needCode) {
    if (!code) errors.code = 'Enter the department code.';
    else if (!CODE_RE.test(code)) errors.code = 'Use 2 or 3 letters or digits, for example HRD.';
  }

  if (!name) errors.name = 'Enter the department name.';
  else if (name.length > 20) errors.name = 'Department name must be 20 characters or fewer.';

  return { errors, value: { ...(needCode ? { code } : {}), name } };
}

module.exports = { validateDepartment, CODE_RE };
