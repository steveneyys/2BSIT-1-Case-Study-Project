'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');

function start(db) {
  const app = createApp({ config: { isProduction: false }, db });
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

test('GET /api/health returns ok without touching the DB', async () => {
  const { server, base } = await start({ ping: async () => { throw new Error('should not be called'); } });
  const res = await fetch(`${base}/api/health`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual((await res.json()).status, 'ok');
  server.close();
});

test('GET /api/health/db is 200 when DB answers, 503 when it does not', async () => {
  let up = true;
  const { server, base } = await start({ ping: async () => { if (!up) throw new Error('boom'); return true; } });
  assert.strictEqual((await fetch(`${base}/api/health/db`)).status, 200);
  up = false;
  const res = await fetch(`${base}/api/health/db`);
  assert.strictEqual(res.status, 503);
  assert.deepStrictEqual(await res.json(), { error: 'Database unreachable' });
  server.close();
});

test('unknown API route returns JSON 404', async () => {
  const { server, base } = await start({});
  const res = await fetch(`${base}/api/nope`);
  assert.strictEqual(res.status, 404);
  server.close();
});
