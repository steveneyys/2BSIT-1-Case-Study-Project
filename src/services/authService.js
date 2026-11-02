'use strict';

const userRepo = require('../repositories/userRepo');
const { hashPassword, verifyPassword } = require('./password');
const { hashToken, newRawToken, RESET_TTL_MS } = require('./passwordToken');
const { validatePassword } = require('../validators/password');

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';
// Wording and codes follow the approved design (S1-UIX-04): the page shows these as status banners.
const PENDING = { error: 'Your account is Pending approval. Contact a Superadmin.', code: 'pending' };
const BLOCKED = { error: 'Your account is Blocked. Contact your administrator.', code: 'blocked' };
// A real-looking hash so unknown emails cost the same time as wrong passwords (no timing leak).
let dummyHash;

// Pure functions (no Express) so they are easy to unit test. Each returns { status, body, user? }.
async function login(db, { email, password }) {
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  const plain = String(password ?? '');
  if (!cleanEmail || !plain) return { status: 400, body: { error: 'Email and password are required.' } };

  const user = await userRepo.findByEmail(db, cleanEmail);
  // Registered but not yet approved: there is no password to check yet, so say where the account stands (design: Pending banner).
  if (user && !user.password_hash && user.status === 'pending') return { status: 403, body: PENDING };
  if (!user || !user.password_hash) {
    dummyHash ??= await hashPassword('dummy-password-1');
    await verifyPassword(plain, dummyHash);
    return { status: 401, body: { error: GENERIC_LOGIN_ERROR } };
  }
  if (!(await verifyPassword(plain, user.password_hash))) {
    return { status: 401, body: { error: GENERIC_LOGIN_ERROR } };
  }

  // Only after the password is correct do we reveal why an account cannot sign in.
  if (user.is_blocked) return { status: 403, body: BLOCKED };
  if (user.status === 'pending') return { status: 403, body: PENDING };
  if (user.status !== 'active') return { status: 403, body: { error: 'Your account cannot sign in.', code: 'denied' } };

  return { status: 200, body: { user: publicUser(user) }, user };
}

async function setPassword(db, { token, password, confirmPassword }) {
  const errors = validatePassword(String(password ?? ''), String(confirmPassword ?? ''));
  if (Object.keys(errors).length) return { status: 400, body: { errors } };
  if (!token) return { status: 400, body: { error: 'This link cannot be used.', code: 'invalid' } };

  const passwordHash = await hashPassword(String(password));
  const ok = await db.tx(async (client) => {
    const userId = await userRepo.consumePasswordToken(client, hashToken(token));
    if (userId === null) return false;
    await userRepo.setPasswordHash(client, userId, passwordHash);
    return true;
  });
  if (!ok) {
    const status = await passwordTokenStatus(db, token);
    return { status: 400, body: { error: 'This link cannot be used.', code: status === 'valid' ? 'invalid' : status } };
  }
  return { status: 200, body: { message: 'Password saved. You can now sign in.' } };
}

// 'valid' | 'used' | 'expired' | 'invalid' so the page can show the right screen (design: expired / used link).
async function passwordTokenStatus(db, token) {
  if (!token) return 'invalid';
  const row = await userRepo.findPasswordToken(db, hashToken(token));
  if (!row) return 'invalid';
  if (row.used_at) return 'used';
  return row.live ? 'valid' : 'expired';
}

const FORGOT_MESSAGE = 'If that email belongs to an account, a reset link has been sent. It is valid for 1 hour.';

// Always answers the same way whether or not the email exists, so it cannot be used to find accounts.
// Blocked, pending and unknown accounts silently get no email.
async function requestPasswordReset(db, { email }, { mailer, appUrl }) {
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  if (!cleanEmail) return { status: 400, body: { error: 'Email is required.' } };

  const user = await userRepo.findByEmail(db, cleanEmail);
  if (user && user.status === 'active' && !user.is_blocked) {
    const raw = newRawToken();
    await userRepo.invalidateUserTokens(db, user.user_id);
    await userRepo.createPasswordToken(db, {
      userId: user.user_id,
      tokenHash: hashToken(raw),
      purpose: 'reset',
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });
    // Not awaited: response time must not reveal whether an email was sent.
    mailer
      .send({
        to: user.email,
        subject: 'Reset your Hope ERP password',
        text:
          `Hello ${user.first_name},\n\nUse this link to choose a new password (valid for 1 hour, one use):\n` +
          `${appUrl}/reset-password.html?token=${raw}\n\nIf you did not ask for this, ignore this email.`,
      })
      .catch((err) => console.error('[mail] failed to send reset email:', err.message));
  }
  return { status: 200, body: { message: FORGOT_MESSAGE } };
}

function publicUser(u) {
  return { id: u.user_id, firstName: u.first_name, lastName: u.last_name, email: u.email, role: u.role, status: u.status };
}

module.exports = { PENDING, BLOCKED, login, setPassword, passwordTokenStatus, requestPasswordReset, publicUser };
