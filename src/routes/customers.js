'use strict';

const express = require('express');
const customerRepo = require('../repositories/customerRepo');
const { createCustomers, VIEW_RIGHTS } = require('../services/customers');
const { requireAuth } = require('../middleware/auth');
const { requireRight } = require('../middleware/permissions');

module.exports = function customerRoutes(db, perms) {
  const router = express.Router();
  const customers = createCustomers({ db, repo: customerRepo, perms });

  // Server-side gate: signed in AND holding at least one customer right (admins and superadmins always do).
  router.use(requireAuth, requireRight(perms, ...VIEW_RIGHTS));

  router.get('/', async (req, res, next) => {
    try {
      const { status, body } = await customers.list(req.user, req.query);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  });

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/:code', handle((req) => customers.get(req.params.code)));
  router.post('/', requireRight(perms, 'CUST_ADD'), handle((req) => customers.create(req.user, req.body)));
  router.put('/:code', requireRight(perms, 'CUST_EDIT'), handle((req) => customers.update(req.user, req.params.code, req.body)));

  return router;
};
