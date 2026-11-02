'use strict';

const userRepo = require('../repositories/userRepo');
const { PENDING, BLOCKED, publicUser } = require('./authService');

const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const UNIQUE_VIOLATION = '23505';

// Checks a Google ID token (the "credential" the Google button returns) by asking Google to validate it,
// then confirms it was issued for THIS app (aud), is not expired, and has a verified email.
// Returns { email, firstName, lastName } or null. Nothing from the browser is trusted without this check.
function createGoogleVerifier(clientId, fetchFn = globalThis.fetch) {
  return async function verify(credential) {
    if (!clientId || typeof credential !== 'string' || !credential || credential.length > 4096) return null;
    let info;
    try {
      const res = await fetchFn(`${TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`);
      if (!res.ok) return null;
      info = await res.json();
    } catch {
      return null;
    }
    const verified = info.email_verified === true || info.email_verified === 'true';
    const expired = !(Number(info.exp) * 1000 > Date.now());
    if (info.aud !== clientId || !ISSUERS.includes(info.iss) || !verified || expired || !info.email) return null;

    const email = String(info.email).trim().toLowerCase();
    const fallback = email.split('@')[0];
    return {
      email,
      firstName: String(info.given_name || info.name || fallback).trim().slice(0, 50) || 'User',
      lastName: String(info.family_name || '').trim().slice(0, 50) || '-',
    };
  };
}

// Google sign-in and sign-up in one step. It NEVER bypasses approval:
//  - unknown email  -> a Pending account is created (same as Register) and no session is issued
//  - Pending / Blocked / any non-active account -> refused with the same banners as the password login
//  - Active account -> signed in
async function googleSignIn(db, verify, credential) {
  const profile = await verify(credential);
  if (!profile || profile.email.length > 100) {
    return { status: 401, body: { error: 'Google sign-in could not be verified. Please try again.', code: 'google_failed' } };
  }

  let user = await userRepo.findByEmail(db, profile.email);
  if (!user) {
    try {
      await userRepo.createPendingUser(db, { ...profile, passwordHash: null });
    } catch (err) {
      if (err.code !== UNIQUE_VIOLATION) throw err;
    }
    return {
      status: 403,
      body: { error: 'Your account was created and is Pending approval. A Superadmin must approve it before you can sign in.', code: 'pending', created: true },
    };
  }
  if (user.is_blocked) return { status: 403, body: BLOCKED };
  if (user.status === 'pending') return { status: 403, body: PENDING };
  if (user.status !== 'active') return { status: 403, body: { error: 'Your account cannot sign in.', code: 'denied' } };
  return { status: 200, body: { user: publicUser(user) }, user };
}

module.exports = { createGoogleVerifier, googleSignIn };
