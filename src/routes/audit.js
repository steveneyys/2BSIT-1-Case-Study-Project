'use strict';

const express = require('express');
const repo = require('../repositories/auditRepo');
const { createAudit } = require('../services/audit');
const { requireAuth, requireRole } = require('../middleware/auth');

// Superadmin only. There is no audit right to tick, so this is a role check, not a rights check.
module.exports = function auditRoutes(db) {
  const router = express.Router();
  const audit = createAudit({ db, repo });
  router.use(requireAuth, requireRole('superadmin'));

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/', handle((req) => audit.list(req.user, req.query)));
  router.get('/options', handle((req) => audit.options(req.user)));
  return router;
};
