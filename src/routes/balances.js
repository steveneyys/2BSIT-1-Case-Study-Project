'use strict';

const express = require('express');
const repo = require('../repositories/balanceRepo');
const { createBalances } = require('../services/balances');
const { VIEW_RIGHTS } = require('../services/payments');
const { requireAuth } = require('../middleware/auth');
const { requireRight } = require('../middleware/permissions');

module.exports = function balanceRoutes(db, perms) {
  const router = express.Router();
  const balances = createBalances({ db, repo });

  // Balances are read-only and follow the same rights as the Payments list (see services/payments.js): the rights that open the Sales list.
  router.use(requireAuth, requireRight(perms, ...VIEW_RIGHTS));

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/transactions/:transno', handle((req) => balances.transaction(req.user, req.params.transno)));
  router.get('/customers/:custno', handle((req) => balances.customer(req.user, req.params.custno)));

  return router;
};
