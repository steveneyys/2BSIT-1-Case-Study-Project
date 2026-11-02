'use strict';

const crypto = require('node:crypto');

const SET_PASSWORD_TTL_MS = 24 * 60 * 60 * 1000; // first-password link
const RESET_TTL_MS = 60 * 60 * 1000;             // reset link (S1-DEV-04)

// The raw token goes in the link; only its SHA-256 hash is stored, so a DB leak exposes no usable links.
const hashToken = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');
const newRawToken = () => crypto.randomBytes(32).toString('base64url');

module.exports = { SET_PASSWORD_TTL_MS, RESET_TTL_MS, hashToken, newRawToken };
