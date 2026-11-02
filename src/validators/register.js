'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Registration asks for first name, last name and email only (design S1-UIX-02/04).
// There is NO password at registration: the person sets one through a one-time link after a Superadmin approves.
// Only whitelisted fields are read, so a client can never set role/status/isBlocked.
function validateRegistration(body = {}) {
  const errors = {};
  const firstName = String(body.firstName ?? '').trim();
  const lastName = String(body.lastName ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();

  if (!firstName) errors.firstName = 'Enter your first name.';
  else if (firstName.length > 50) errors.firstName = 'First name must be 50 characters or fewer.';

  if (!lastName) errors.lastName = 'Enter your last name.';
  else if (lastName.length > 50) errors.lastName = 'Last name must be 50 characters or fewer.';

  if (!email) errors.email = 'Enter your email address.';
  else if (email.length > 100 || !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';

  return { errors, value: { firstName, lastName, email } };
}

module.exports = { validateRegistration };
