'use strict';

const express = require('express');
const repo = require('../repositories/reportRepo');
const { createReports, REPORT_RIGHTS } = require('../services/reports');
const { requireAuth } = require('../middleware/auth');
const { requireRight } = require('../middleware/permissions');

module.exports = function reportRoutes(db, perms) {
  const router = express.Router();
  const reports = createReports({ db, repo, perms });

  // Server-side gate: signed in AND holding at least one report right (admins and superadmins always do).
  router.use(requireAuth, requireRight(perms, ...REPORT_RIGHTS));

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/', handle((req) => reports.index(req.user)));
  // One route per report, each needing exactly that report's right.
  for (const [slug, def] of Object.entries(reports.defs)) {
    router.get(`/${slug}`, requireRight(perms, def.right), handle((req) => reports.run(req.user, slug, req.query)));
  }

  return router;
};
