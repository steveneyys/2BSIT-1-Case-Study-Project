'use strict';

const express = require('express');
const userRepo = require('../repositories/userRepo');
const { createUserManagement } = require('../services/userManagement');
const { createMailer } = require('../services/mailer');
const { requireAuth, requireRole } = require('../middleware/auth');

module.exports = function userRoutes(db, config) {
  const router = express.Router();
  const um = createUserManagement({ db, repo: userRepo, mailer: createMailer(config), appUrl: config.appUrl });

  // Server-side gate: plain Users get 403 here no matter what the UI shows.
  router.use(requireAuth, requireRole('admin', 'superadmin'));

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/', handle((req) => um.list(req.user, req.query.q)));
  router.post('/', handle((req) => um.create(req.user, req.body)));
  router.get('/:id', handle((req) => um.get(req.user, req.params.id)));
  router.patch('/:id', handle((req) => um.update(req.user, req.params.id, req.body)));
  router.post('/:id/block', handle((req) => um.block(req.user, req.params.id)));
  router.post('/:id/unblock', handle((req) => um.unblock(req.user, req.params.id)));
  router.post('/:id/approve', handle((req) => um.approve(req.user, req.params.id)));
  router.post('/:id/make-admin', handle((req) => um.makeAdmin(req.user, req.params.id)));
  router.post('/:id/remove-admin', handle((req) => um.removeAdmin(req.user, req.params.id)));

  return router;
};
