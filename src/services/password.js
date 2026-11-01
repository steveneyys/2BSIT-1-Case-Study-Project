'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const KEYLEN = 64;

// Format: scrypt$<salt hex>$<hash hex>. Salted, slow, built into Node (no native build needed).
async function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(plain, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

// Reused by login (S1-DEV-03).
async function verifyPassword(plain, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(plain, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPassword, verifyPassword };
