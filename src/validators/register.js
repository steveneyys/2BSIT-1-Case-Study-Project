'use strict';

const { validatePassword } = require('./password');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Registration: first name, last name, email, password, and password confirmation.
// Role and account status are never accepted from the browser.
function validateRegistration(body = {}) {
  const errors = {};
  const firstName = String(body.firstName ?? '').trim();
  const lastName = String(body.lastName ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const confirmPassword = String(body.confirmPassword ?? '');

  if (!firstName) errors.firstName = 'Enter your first name.';
  else if (firstName.length > 50) {
    errors.firstName = 'First name must be 50 characters or fewer.';
  }

  if (!lastName) errors.lastName = 'Enter your last name.';
  else if (lastName.length > 50) {
    errors.lastName = 'Last name must be 50 characters or fewer.';
  }

  if (!email) errors.email = 'Enter your email address.';
  else if (email.length > 100 || !EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  Object.assign(errors, validatePassword(password, confirmPassword));

  return {
    errors,
    value: { firstName, lastName, email, password },
  };
}

module.exports = { validateRegistration };