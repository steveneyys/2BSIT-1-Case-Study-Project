'use strict';

const { validateRegistration } = require('../validators/register');
const userRepo = require('../repositories/userRepo');

const UNIQUE_VIOLATION = '23505';

// Pure function (no Express) so it is easy to unit test. Returns { status, body }.
async function registerUser(db, body) {
  const { errors, value } = validateRegistration(body);
  if (Object.keys(errors).length) return { status: 400, body: { errors } };

  try {
    await userRepo.createPendingUser(db, { ...value, passwordHash: null });
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return { status: 409, body: { errors: { email: 'An account with this email already exists.' } } };
    }
    throw err;
  }
  return {
    status: 201,
    body: { message: 'Registration received. Your account is Pending approval. A Superadmin must approve your request before you can sign in.' },
  };
}

module.exports = { registerUser };
