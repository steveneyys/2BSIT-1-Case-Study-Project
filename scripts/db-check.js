// Quick health check: row counts and expected values. Run: npm run db:check
const { makeClient } = require('./lib/db');

const EXPECT = {
  customer: 92, product: 65, sales: 124, salesdetail: 313, payment: 165,
  pricehist: 93, jobhistory: 54, job: 14,
  role: 3, module: 5, right_catalog: 36,
};

async function main() {
  const client = makeClient();
  await client.connect();
  let bad = 0;
  for (const [table, want] of Object.entries(EXPECT)) {
    const got = Number((await client.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${table.padEnd(14)} ${got} (expected ${want})`);
  }
  const su = Number((await client.query(
    "SELECT count(*) AS n FROM app_user_active WHERE role_code = 'superadmin'")).rows[0].n);
  console.log(`INFO superadmin accounts: ${su}`);
  await client.end();
  process.exit(bad ? 1 : 0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
