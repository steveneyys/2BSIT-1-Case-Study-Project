'use strict';

const express = require('express');
const departmentRepo = require('../repositories/departmentRepo');
const { createDepartments, VIEW_RIGHTS } = require('../services/departments');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireRight } = require('../middleware/permissions');

module.exports = function departmentRoutes(db, perms) {
  const router = express.Router();
  const departments = createDepartments({ db, repo: departmentRepo, perms });

  // Server-side gate: signed in AND holding at least one department right (admins and superadmins always do).
  router.use(requireAuth, requireRight(perms, ...VIEW_RIGHTS));

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/', handle((req) => departments.list(req.user, req.query)));
  router.get('/:code', handle((req) => departments.get(req.params.code)));
  router.post('/', requireRight(perms, 'DEPT_ADD'), handle((req) => departments.create(req.user, req.body)));
  router.put('/:code', requireRight(perms, 'DEPT_EDIT'), handle((req) => departments.update(req.user, req.params.code, req.body)));
  router.delete('/:code', requireRight(perms, 'DEPT_DELETE'), handle((req) => departments.remove(req.user, req.params.code)));
  router.post('/:code/restore', requireRole('admin', 'superadmin'), handle((req) => departments.restore(req.user, req.params.code)));

  return router;
};
