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

  return router;
};
