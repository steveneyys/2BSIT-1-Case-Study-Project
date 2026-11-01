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
  };

  // Fail fast with a clear message instead of a confusing error later.
  const missing = [];
  if (nodeEnv !== 'test' && !config.databaseUrl) missing.push('DATABASE_URL');
  if (config.isProduction && (!config.sessionSecret || config.sessionSecret === 'change-me')) {
    missing.push('SESSION_SECRET');
  }
  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. Copy .env.example to .env and fill them in.`
    );
  }
  return config;
}

module.exports = { loadConfig };
