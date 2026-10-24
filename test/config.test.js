'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadConfig } = require('../src/config');

test('defaults: port 3000, ssl on', () => {
  const c = loadConfig({ NODE_ENV: 'test' });
  assert.strictEqual(c.port, 3000);
  assert.strictEqual(c.dbSsl, true);
});

test('fails fast when DATABASE_URL is missing outside test', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'development' }), /DATABASE_URL/);
});

test('production requires a real SESSION_SECRET', () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://x', SESSION_SECRET: 'change-me' }),
    /SESSION_SECRET/
  );
});

test('DB_SSL=false disables ssl', () => {
  assert.strictEqual(loadConfig({ NODE_ENV: 'test', DB_SSL: 'false' }).dbSsl, false);
});
