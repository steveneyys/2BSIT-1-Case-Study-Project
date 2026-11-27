'use strict';

const express = require('express');
const repo = require('../repositories/saleRepo');
const { createSales, VIEW_RIGHTS, LIST_RIGHTS } = require('../services/sales');
const { requireAuth } = require('../middleware/auth');
const { requireRight } = require('../middleware/permissions');

module.exports = function salesRoutes(db, perms) {
  const router = express.Router();
  const sales = createSales({ db, repo, perms });

  // Server-side gate: signed in AND holding at least one sales right (admins and superadmins always do).
  router.use(requireAuth, requireRight(perms, ...VIEW_RIGHTS));

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/', requireRight(perms, ...LIST_RIGHTS), handle((req) => sales.list(req.user, req.query)));
  // Drop-down choices for the form. Registered before any "/:transno" route so "options" is never read as a number.
  router.get('/options', requireRight(perms, 'SALE_ADD', 'SALE_EDIT'), handle(() => sales.options()));
  router.post('/', requireRight(perms, 'SALE_ADD'), handle((req) => sales.create(req.user, req.body)));
  router.put('/:transno', requireRight(perms, 'SALE_EDIT'), handle((req) => sales.update(req.user, req.params.transno, req.body)));

  return router;
};
