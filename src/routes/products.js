'use strict';

const express = require('express');
const productRepo = require('../repositories/productRepo');
const priceRepo = require('../repositories/priceRepo');
const { createPrices } = require('../services/prices');
const { createProducts, VIEW_RIGHTS } = require('../services/products');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireRight } = require('../middleware/permissions');

module.exports = function productRoutes(db, perms) {
  const router = express.Router();
  const products = createProducts({ db, repo: productRepo, perms });
  const prices = createPrices({ db, productRepo, repo: priceRepo, perms });

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

  router.delete('/:code', requireRight(perms, 'PROD_DELETE'), handle((req) => products.remove(req.user, req.params.code)));
  router.post('/:code/restore', requireRole('admin', 'superadmin'), handle((req) => products.restore(req.user, req.params.code)));

  // Price history (S2-DEV-07). Anyone who can open the module can read it; each change needs its own right.
  router.get('/:code/prices', handle((req) => prices.list(req.user, req.params.code)));
  router.post('/:code/prices', requireRight(perms, 'PRICE_ADD'), handle((req) => prices.create(req.user, req.params.code, req.body)));
  router.put('/:code/prices/:effdate', requireRight(perms, 'PRICE_EDIT'), handle((req) => prices.update(req.user, req.params.code, req.params.effdate, req.body)));
  router.delete('/:code/prices/:effdate', requireRight(perms, 'PRICE_DELETE'), handle((req) => prices.remove(req.user, req.params.code, req.params.effdate)));

  return router;
};
