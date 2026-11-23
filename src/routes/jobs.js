'use strict';

const express = require('express');
const jobRepo = require('../repositories/jobRepo');
const { createJobs, VIEW_RIGHTS } = require('../services/jobs');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireRight } = require('../middleware/permissions');

module.exports = function jobRoutes(db, perms) {
  const router = express.Router();
  const jobs = createJobs({ db, repo: jobRepo, perms });

  // Server-side gate: signed in AND holding at least one job right (admins and superadmins always do).
  router.use(requireAuth, requireRight(perms, ...VIEW_RIGHTS));

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/', handle((req) => jobs.list(req.user, req.query)));
  router.get('/:code', handle((req) => jobs.get(req.params.code)));
  router.post('/', requireRight(perms, 'JOB_ADD'), handle((req) => jobs.create(req.user, req.body)));
  router.put('/:code', requireRight(perms, 'JOB_EDIT'), handle((req) => jobs.update(req.user, req.params.code, req.body)));
  router.delete('/:code', requireRight(perms, 'JOB_DELETE'), handle((req) => jobs.remove(req.user, req.params.code)));
  router.post('/:code/restore', requireRole('admin', 'superadmin'), handle((req) => jobs.restore(req.user, req.params.code)));

  return router;
};
