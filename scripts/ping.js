const { makeClient } = require('./lib/db');

(async () => {
  const client = makeClient();
  try {
    await client.connect();
    const r = await client.query('SELECT now() AS now, current_database() AS db');
    console.log('Connected to', r.rows[0].db, 'at', r.rows[0].now);
  } catch (e) {
    console.error('Could not connect:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
})();
