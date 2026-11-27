'use strict';

const express = require('express');
const repo = require('../repositories/paymentRepo');
const { createPayments, VIEW_RIGHTS, RECORD_RIGHT } = require('../services/payments');
const { requireAuth } = require('../middleware/auth');
const { requireRight } = require('../middleware/permissions');

module.exports = function paymentRoutes(db, perms) {
  const router = express.Router();
  const payments = createPayments({ db, repo, perms });

  // Server-side gate: signed in AND able to see sales (payments follow the sales rights until payment rights exist).
  router.use(requireAuth, requireRight(perms, ...VIEW_RIGHTS));

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/', handle((req) => payments.list(req.user, req.query)));
  router.get('/options', requireRight(perms, RECORD_RIGHT), handle((req) => payments.options(req.query)));
  router.post('/', requireRight(perms, RECORD_RIGHT), handle((req) => payments.create(req.user, req.body)));

  return router;
};
