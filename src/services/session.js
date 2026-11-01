'use strict';

const crypto = require('node:crypto');

const COOKIE_NAME = 'hope_sid';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const sign = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

// Token = base64url(JSON{uid,exp}) + '.' + HMAC. Stateless; the user row is re-checked on every
// request (middleware/auth.js), so blocking a user takes effect immediately.
function createSessionToken(userId, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: now + SESSION_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

// Returns the user id, or null if the token is missing, tampered with or expired.
function verifySessionToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return exp > now ? uid : null;
  } catch {
    return null;
  }
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookieOptions(config) {
  return { httpOnly: true, sameSite: 'lax', secure: config.isProduction, path: '/' };
}

module.exports = { COOKIE_NAME, SESSION_TTL_MS, createSessionToken, verifySessionToken, parseCookies, cookieOptions };
