'use strict';

const CODE_RE = /^[A-Z0-9]{2,4}$/; // jobCode VARCHAR(4), jobDesc VARCHAR(20); existing codes are PRES, VP, MGR, SA1, SPVR, CLK1, PR1, ANYS

// Limits match the database columns: jobCode VARCHAR(4), jobDesc VARCHAR(20).
// `needCode` is true on Add (the person types the code); on Edit the code comes from the address, never the body.
function validateJob(body = {}, { needCode = false } = {}) {
  const errors = {};
  const code = String(body.code ?? '').trim().toUpperCase();
  const description = String(body.description ?? '').trim();

  if (needCode) {
    if (!code) errors.code = 'Enter the job code.';
    else if (!CODE_RE.test(code)) errors.code = 'Use 2 to 4 letters or digits, for example MGR.';
  }

  if (!description) errors.description = 'Enter the job description.';
  else if (description.length > 20) errors.description = 'Job description must be 20 characters or fewer.';

  return { errors, value: { ...(needCode ? { code } : {}), description } };
}

module.exports = { validateJob, CODE_RE };
