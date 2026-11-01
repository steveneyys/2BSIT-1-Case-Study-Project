'use strict';

const userRepo = require('../repositories/userRepo');
const { hashPassword, verifyPassword } = require('./password');
const { hashToken } = require('./passwordToken');
const { validatePassword } = require('../validators/password');

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';
// A real-looking hash so unknown emails cost the same time as wrong passwords (no timing leak).
let dummyHash;

// Pure functions (no Express) so they are easy to unit test. Each returns { status, body, user? }.
async function login(db, { email, password }) {
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  const plain = String(password ?? '');
  if (!cleanEmail || !plain) return { status: 400, body: { error: 'Email and password are required.' } };

  const user = await userRepo.findByEmail(db, cleanEmail);
  if (!user || !user.password_hash) {
    dummyHash ??= await hashPassword('dummy-password-1');
    await verifyPassword(plain, dummyHash);
    return { status: 401, body: { error: GENERIC_LOGIN_ERROR } };
  }
  if (!(await verifyPassword(plain, user.password_hash))) {
    return { status: 401, body: { error: GENERIC_LOGIN_ERROR } };
  }

  // Only after the password is correct do we reveal why an account cannot sign in.
  if (user.is_blocked) return { status: 403, body: { error: 'Your account is blocked. Contact an administrator.' } };
  if (user.status === 'pending') {
    return { status: 403, body: { error: 'Your account is waiting for administrator approval.' } };
  }
  if (user.status !== 'active') return { status: 403, body: { error: 'Your account cannot sign in.' } };

  return { status: 200, body: { user: publicUser(user) }, user };
}

async function setPassword(db, { token, password, confirmPassword }) {
  const errors = validatePassword(String(password ?? ''), String(confirmPassword ?? ''));
  if (Object.keys(errors).length) return { status: 400, body: { errors } };
  if (!token) return { status: 400, body: { error: 'This link is invalid or has expired.' } };

  const passwordHash = await hashPassword(String(password));
  const ok = await db.tx(async (client) => {
    const userId = await userRepo.consumePasswordToken(client, hashToken(token));
    if (userId === null) return false;
    await userRepo.setPasswordHash(client, userId, passwordHash);
    return true;
  });
  if (!ok) return { status: 400, body: { error: 'This link is invalid or has expired.' } };
  return { status: 200, body: { message: 'Password saved. You can now sign in.' } };
}

function publicUser(u) {
  return { id: u.user_id, firstName: u.first_name, lastName: u.last_name, email: u.email, role: u.role, status: u.status };
}

module.exports = { login, setPassword, publicUser };
