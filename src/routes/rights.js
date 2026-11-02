'use strict';

const express = require('express');
const userRepo = require('../repositories/userRepo');
const rightsRepo = require('../repositories/rightsRepo');
const { createRights } = require('../services/rights');
const { requireAuth, requireRole } = require('../middleware/auth');

module.exports = function rightsRoutes(db) {
  const router = express.Router();
  const rights = createRights({ db, repo: rightsRepo, userRepo });

  // Server-side gate: only admins and superadmins may read or change rights.
  router.use(requireAuth, requireRole('admin', 'superadmin'));

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/catalog', handle(() => rights.catalog()));
  router.get('/users/:id', handle((req) => rights.getUserRights(req.user, req.params.id)));
  router.put('/users/:id', handle((req) => rights.setUserRights(req.user, req.params.id, req.body)));

  return router;
};
