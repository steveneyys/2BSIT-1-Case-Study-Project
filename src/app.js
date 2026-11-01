'use strict';

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const healthRoutes = require('./routes/health');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// App factory: takes config and db so tests can inject fakes.
function createApp({ config, db }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProduction) app.set('trust proxy', 1); // needed for secure cookies in DEV-03

  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api/health', healthRoutes(db));
  // Later PRs mount here: /api/auth (DEV-02..04), /api/users (DEV-05..06), /api/rights (DEV-07)

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
