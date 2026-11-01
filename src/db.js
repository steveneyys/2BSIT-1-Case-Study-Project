'use strict';

const { Pool } = require('pg');

// Supabase uses certificates that Node does not trust by default; rejectUnauthorized:false
// still encrypts the connection. Tighten later by supplying Supabase's CA cert if required.
function createPool(config) {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.dbSsl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // An idle client erroring must not crash the process.
  pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  return pool;
}

// Thin wrapper so later PRs call db.query(sql, params) and never touch the pool directly.
function createDb(config) {
  const pool = createPool(config);
  return {
    pool,
    query: (text, params) => pool.query(text, params),
    ping: async () => (await pool.query('SELECT 1 AS ok')).rows[0].ok === 1,
    close: () => pool.end(),
  };
}

module.exports = { createDb };
