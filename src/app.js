'use strict';

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const rightsRoutes = require('./routes/rights');
const menuRoutes = require('./routes/menu');
const customerRoutes = require('./routes/customers');
const rightsRepo = require('./repositories/rightsRepo');
const { createPermissions } = require('./services/permissions');
const { guardPages } = require('./middleware/pageGuard');
const { attachUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// App factory: takes config and db so tests can inject fakes.
function createApp({ config, db, googleVerifier }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProduction) app.set('trust proxy', 1); // needed for secure cookies in DEV-03

  // Google's sign-in button (accounts.google.com/gsi) needs these extra allowances; everything else keeps helmet's defaults.
  const GSI = 'https://accounts.google.com/gsi/';
  const defaults = helmet.contentSecurityPolicy.getDefaultDirectives();
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...defaults,
          'script-src': [...defaults['script-src'], 'https://accounts.google.com/gsi/client'],
          'frame-src': ["'self'", GSI],
          'connect-src': ["'self'", GSI],
          'style-src': [...defaults['style-src'], GSI],
        },
      },
      // The Google button opens a popup that must be able to talk back to this page.
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const perms = createPermissions({ db, repo: rightsRepo });
  app.locals.perms = perms;
  app.use(guardPages(db, config, undefined, perms)); // server-side check for protected pages, before they are served
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api', attachUser(db, config)); // sets req.user when a valid session cookie is present
  app.use('/api/health', healthRoutes(db));
  app.use('/api/auth', authRoutes(db, config, { googleVerifier }));
  app.use('/api/users', userRoutes(db, config));
  app.use('/api/rights', rightsRoutes(db));
  // Reusable permission checks for later sprints: requireRight(perms, 'RIGHT_CODE') from middleware/permissions.js
  app.use('/api/menu', menuRoutes(db, perms));
  app.use('/api/customers', customerRoutes(db, perms));
  // Later PRs mount here: /api/auth (DEV-02..04), /api/users (DEV-05..06), /api/rights (DEV-07)

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
