'use strict';

const express = require('express');
const repo = require('../repositories/jobHistoryRepo');
const { createJobHistory, VIEW_RIGHTS } = require('../services/jobHistory');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireRight } = require('../middleware/permissions');

module.exports = function jobHistoryRoutes(db, perms) {
  const router = express.Router();
  const history = createJobHistory({ db, repo, perms });

  // Server-side gate: signed in AND holding at least one job history right (admins and superadmins always do).
  // Seeing the history and its salaries needs the View Job History right on top of that (checked on GET below).
  router.use(requireAuth, requireRight(perms, ...VIEW_RIGHTS));

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  const key = '/:empno/:jobcode/:effdate';
  router.get('/:empno', requireRight(perms, 'JOBHIST_VIEW'), handle((req) => history.view(req.user, req.params.empno)));
  router.post('/:empno', requireRight(perms, 'JOBHIST_ADD'), handle((req) => history.create(req.user, req.params.empno, req.body)));
  router.put(key, requireRight(perms, 'JOBHIST_EDIT'), handle((req) => history.update(req.user, req.params.empno, req.params.jobcode, req.params.effdate, req.body)));
  router.delete(key, requireRight(perms, 'JOBHIST_DELETE'), handle((req) => history.remove(req.user, req.params.empno, req.params.jobcode, req.params.effdate)));
  router.post(`${key}/restore`, requireRole('admin', 'superadmin'), handle((req) => history.restore(req.user, req.params.empno, req.params.jobcode, req.params.effdate)));

  return router;
};
