// Creates one superadmin per team member (no passwords) and prints a one-time
// set-password link for each. Safe to re-run: existing accounts are skipped.
const crypto = require('crypto');
const { makeClient } = require('./lib/db');

const DAYS_VALID = 7;
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');

async function main() {
  const people = (process.env.SEED_SUPERADMINS || '')
    .split(';').map((s) => s.trim()).filter(Boolean)
    .map((s) => { const [first, last, email] = s.split('|').map((x) => (x || '').trim()); return { first, last, email }; });
  if (!people.length || people.some((p) => !p.first || !p.last || !p.email)) {
    console.error('Set SEED_SUPERADMINS in .env as: First|Last|email;First|Last|email');
    process.exit(1);
  }
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  const client = makeClient();
  await client.connect();
  try {
    await client.query('BEGIN');
    // the stamp and audit_log will show "seed" as the actor
    await client.query("SELECT set_config('app.username', 'seed', true)");

    for (const p of people) {
      let user = (await client.query(
        'SELECT user_id, password_hash FROM app_user WHERE lower(email) = lower($1) AND NOT is_deleted', [p.email]
      )).rows[0];

      if (!user) {
        user = (await client.query(
          `INSERT INTO app_user (first_name, last_name, email, role_code, approval_status)
           VALUES ($1, $2, $3, 'superadmin', 'active') RETURNING user_id, password_hash`,
          [p.first, p.last, p.email]
        )).rows[0];
        console.log(`created ${p.email}`);
      } else {
        console.log(`exists  ${p.email}`);
      }

      if (user.password_hash) { console.log('        password already set, no link needed'); continue; }

      // replace any unused first-password token with a fresh one
      await client.query(
        `UPDATE password_token SET used_at = now()
          WHERE user_id = $1 AND purpose = 'first_password' AND used_at IS NULL`, [user.user_id]);
      const raw = crypto.randomBytes(32).toString('hex');
      await client.query(
        `INSERT INTO password_token (user_id, token_hash, purpose, expires_at)
         VALUES ($1, $2, 'first_password', now() + ($3 || ' days')::interval)`,
        [user.user_id, sha(raw), String(DAYS_VALID)]
      );
      console.log(`        set-password link (valid ${DAYS_VALID} days): ${appUrl}/set-password?token=${raw}`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
