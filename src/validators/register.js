'use strict';

const { validatePassword } = require('./password');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns { errors: {field: message}, value: {cleaned fields} }.
// Only whitelisted fields are read, so a client can never set role/status/isBlocked.
function validateRegistration(body = {}) {
  const errors = {};
  const firstName = String(body.firstName ?? '').trim();
  const lastName = String(body.lastName ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const confirmPassword = String(body.confirmPassword ?? '');

  if (!firstName) errors.firstName = 'First name is required.';
  else if (firstName.length > 50) errors.firstName = 'First name must be 50 characters or fewer.';

  if (!lastName) errors.lastName = 'Last name is required.';
  else if (lastName.length > 50) errors.lastName = 'Last name must be 50 characters or fewer.';

  if (!email) errors.email = 'Email is required.';
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';

  Object.assign(errors, validatePassword(password, confirmPassword));

  return { errors, value: { firstName, lastName, email, password } };
}

module.exports = { validateRegistration };
