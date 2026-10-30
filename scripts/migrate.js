// Runs every un-applied file in /migrations, in filename order.
// Each file runs inside one transaction: it fully applies or not at all.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { makeClient } = require('./lib/db');

const DIR = path.join(__dirname, '..', 'migrations');
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');

async function main() {
  const client = makeClient();
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  const applied = new Map(
    (await client.query('SELECT filename, checksum FROM schema_migrations')).rows
      .map((r) => [r.filename, r.checksum])
  );

  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
  let ran = 0;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
    if (applied.has(file)) {
      if (applied.get(file) !== sha(sql)) {
        console.warn(`WARNING: ${file} was changed after it was applied. Add a NEW migration instead.`);
      }
      console.log(`skip   ${file}`);
      continue;
    }
    console.log(`apply  ${file} ...`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [file, sha(sql)]);
      await client.query('COMMIT');
      ran++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`FAILED ${file}: ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }
  console.log(ran ? `Done. ${ran} migration(s) applied.` : 'Database is up to date.');
  await client.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
