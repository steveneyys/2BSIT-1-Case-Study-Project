'use strict';

// Dev/admin utility: print a one-time set-password link for an existing user (e.g. a seeded superadmin).
// Usage: node scripts/create-set-password-link.js someone@example.com
const { loadConfig } = require('../src/config');
const { createDb } = require('../src/db');
const userRepo = require('../src/repositories/userRepo');
const { newRawToken, hashToken, SET_PASSWORD_TTL_MS } = require('../src/services/passwordToken');

(async () => {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) { console.error('Usage: node scripts/create-set-password-link.js <email>'); process.exit(1); }
  const config = loadConfig();
  const db = createDb(config);
  try {
    const user = await userRepo.findByEmail(db, email);
    if (!user) { console.error(`No user with email ${email}`); process.exitCode = 1; return; }
    const raw = newRawToken();
        await userRepo.createPasswordToken(db, {
      userId: user.user_id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + SET_PASSWORD_TTL_MS),
      purpose: 'first_password',
    });
    console.log(`Set-password link (valid 24h, single use):\nhttp://localhost:${config.port}/set-password.html?token=${raw}`);
  } finally {
    await db.close();
  }
})().catch((err) => { console.error(err.message); process.exit(1); });
