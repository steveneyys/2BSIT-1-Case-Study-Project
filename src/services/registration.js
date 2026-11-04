'use strict';

const { validateRegistration } = require('../validators/register');
const userRepo = require('../repositories/userRepo');
const { hashPassword } = require('./password');
const { hashToken, newRawToken } = require('./passwordToken');

const UNIQUE_VIOLATION = '23505';
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

async function registerUser(db, body, { mailer, appUrl } = {}) {
  const { errors, value } = validateRegistration(body);

  if (Object.keys(errors).length) {
    return { status: 400, body: { errors } };
  }

  if (!mailer || !appUrl) {
    throw new Error('Email verification is not configured.');
  }

  const passwordHash = await hashPassword(value.password);
  let user;

  try {
    user = await userRepo.createPendingUser(db, {
      firstName: value.firstName,
      lastName: value.lastName,
      email: value.email,
      passwordHash,
    });
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return {
        status: 409,
        body: {
          errors: {
            email: 'An account with this email already exists.',
          },
        },
      };
    }

    throw err;
  }

  const rawToken = newRawToken();

  await userRepo.invalidateEmailVerificationTokens(db, user.user_id);
  await userRepo.createEmailVerificationToken(db, {
    userId: user.user_id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });

    try {
    console.log('[mail] sending verification email');

    await mailer.send({
      to: user.email,
      subject: 'Confirm your Hope ERP email address',
      text:
        `Hello ${user.first_name},\n\n` +
        'Please confirm that this is your email address by opening this link. ' +
        'It is valid for 24 hours and can only be used once:\n' +
        `${appUrl}/api/auth/verify-email?token=${rawToken}\n\n` +
        'Your account will remain Pending until a Superadmin approves it.',
    });

    console.log('[mail] verification email accepted by SMTP');
  } catch (err) {
    console.error('[mail] failed to send verification email:', err.message);
  }
  
  return {
    status: 201,
    body: {
      message: 'Registration received. Check your email and open the confirmation link. Your account will remain Pending until a Superadmin approves it.',
    },
  };
}

module.exports = { registerUser };