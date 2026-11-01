'use strict';

const { validateRegistration } = require('../validators/register');
const { hashPassword } = require('./password');
const userRepo = require('../repositories/userRepo');

const UNIQUE_VIOLATION = '23505';

// Pure function (no Express) so it is easy to unit test. Returns { status, body }.
async function registerUser(db, body) {
  const { errors, value } = validateRegistration(body);
  if (Object.keys(errors).length) return { status: 400, body: { errors } };

  try {
    const passwordHash = await hashPassword(value.password);
    await userRepo.createPendingUser(db, { ...value, passwordHash });
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return { status: 409, body: { errors: { email: 'An account with this email already exists.' } } };
    }
    throw err;
  }
  return {
    status: 201,
    body: { message: 'Registration received. An administrator must approve your account before you can sign in.' },
  };
}

module.exports = { registerUser };
