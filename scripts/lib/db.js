require('dotenv').config();
const { Client } = require('pg');

function makeClient() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  const ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };
  return new Client({ connectionString: process.env.DATABASE_URL, ssl });
}

module.exports = { makeClient };
