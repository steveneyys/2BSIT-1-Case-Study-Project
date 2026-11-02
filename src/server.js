'use strict';

const { loadConfig } = require('./config');
const { createDb } = require('./db');
const { createApp } = require('./app');

const config = loadConfig();
const db = createDb(config);
const app = createApp({ config, db });

const server = app.listen(config.port, async () => {
  console.log(`Hope ERP listening on http://localhost:${config.port} (${config.nodeEnv})`);
  try {
    await db.ping();
    console.log('[db] connected');
  } catch (err) {
    console.error('[db] connection FAILED:', err.message);
  }
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
