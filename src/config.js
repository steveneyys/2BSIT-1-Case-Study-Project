'use strict';

// Load .env if present (built into Node >= 20.12; no dotenv package needed).
try {
  process.loadEnvFile();
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

const bool = (v, fallback) =>
  v === undefined || v === '' ? fallback : ['true', '1', 'yes'].includes(String(v).toLowerCase());

function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const config = {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: Number.parseInt(env.PORT, 10) || 3000,
    databaseUrl: env.DATABASE_URL,
    dbSsl: bool(env.DB_SSL, true),
    sessionSecret: env.SESSION_SECRET,
    // Base URL used in emailed links (must be the address users open in their browser).
    appUrl: (env.APP_URL || `http://localhost:${Number.parseInt(env.PORT, 10) || 3000}`).replace(/\/+$/, ''),
    // Optional. Without SMTP_HOST, emails are printed to the server console instead (dev/demo).
    smtp: {
      host: env.SMTP_HOST,
      port: Number.parseInt(env.SMTP_PORT, 10) || 587,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.MAIL_FROM || 'Hope ERP <no-reply@localhost>',
    },
  };

  // Fail fast with a clear message instead of a confusing error later.
  const missing = [];
  if (nodeEnv !== 'test' && !config.databaseUrl) missing.push('DATABASE_URL');
  if (nodeEnv !== 'test' && !config.sessionSecret) missing.push('SESSION_SECRET');
  if (config.isProduction && config.sessionSecret === 'change-me') missing.push('SESSION_SECRET');
  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. Copy .env.example to .env and fill them in.`
    );
  }
  return config;
}

module.exports = { loadConfig };
