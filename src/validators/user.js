'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['superadmin', 'admin', 'user'];

// Validates the fields of the Add/Edit User dialog. Role is checked separately (it depends on who is acting).
function validateUserFields(body = {}) {
  const errors = {};
  const firstName = String(body.firstName ?? '').trim();
  const lastName = String(body.lastName ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();

  if (!firstName) errors.firstName = 'First name is required.';
  else if (firstName.length > 50) errors.firstName = 'First name must be 50 characters or fewer.';
  if (!lastName) errors.lastName = 'Last name is required.';
  else if (lastName.length > 50) errors.lastName = 'Last name must be 50 characters or fewer.';
  if (!email) errors.email = 'Email is required.';
  else if (email.length > 100 || !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';

  return { errors, value: { firstName, lastName, email } };
}

// Edit User: the email is read-only (design S1-UIX-04), so only the names are validated.
function validateNameFields(body = {}) {
  const { errors, value } = validateUserFields({ ...body, email: 'unchanged@example.com' });
  delete errors.email;
  return { errors, value: { firstName: value.firstName, lastName: value.lastName } };
}

module.exports = { validateUserFields, validateNameFields, ROLES };
