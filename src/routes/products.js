'use strict';

const express = require('express');
const productRepo = require('../repositories/productRepo');
const { createProducts, VIEW_RIGHTS } = require('../services/products');
const { requireAuth } = require('../middleware/auth');
const { requireRight } = require('../middleware/permissions');

module.exports = function productRoutes(db, perms) {
  const router = express.Router();
  const products = createProducts({ db, repo: productRepo, perms });

  // Server-side gate: signed in AND holding at least one product or price right (admins and superadmins always do).
  router.use(requireAuth, requireRight(perms, ...VIEW_RIGHTS));

  router.get('/', async (req, res, next) => {
    try {
      const { status, body } = await products.list(req.user, req.query);
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

  router.get('/:code', handle((req) => products.get(req.params.code)));
  router.post('/', requireRight(perms, 'PROD_ADD'), handle((req) => products.create(req.user, req.body)));
  router.put('/:code', requireRight(perms, 'PROD_EDIT'), handle((req) => products.update(req.user, req.params.code, req.body)));

  return router;
};
