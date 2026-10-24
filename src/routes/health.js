'use strict';

const express = require('express');

module.exports = function healthRoutes(db) {
  const router = express.Router();

  // Liveness: is the app up? (no DB call)
  router.get('/', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  // Readiness: can the app reach the database?
  router.get('/db', async (_req, res, next) => {
    try {
      await db.ping();
      res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
      err.status = 503;
      err.publicMessage = 'Database unreachable';
      next(err);
    }
  });

  return router;
};
