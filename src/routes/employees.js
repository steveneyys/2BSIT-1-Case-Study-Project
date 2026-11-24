'use strict';

const express = require('express');
const employeeRepo = require('../repositories/employeeRepo');
const { createEmployees, VIEW_RIGHTS } = require('../services/employees');
const { requireAuth } = require('../middleware/auth');
const { requireRight } = require('../middleware/permissions');

module.exports = function employeeRoutes(db, perms) {
  const router = express.Router();
  const employees = createEmployees({ db, repo: employeeRepo, perms });

  // Server-side gate: signed in AND holding at least one employee right (admins and superadmins always do).
  router.use(requireAuth, requireRight(perms, ...VIEW_RIGHTS));

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/', handle((req) => employees.list(req.user, req.query)));
  router.post('/', requireRight(perms, 'EMP_ADD'), handle((req) => employees.create(req.user, req.body)));
  router.put('/:empno', requireRight(perms, 'EMP_EDIT'), handle((req) => employees.update(req.user, req.params.empno, req.body)));
  // Delete and Restore arrive in S3-DEV-05.

  return router;
};
