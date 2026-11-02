'use strict';

const express = require('express');
const rightsRepo = require('../repositories/rightsRepo');
const { buildMenu } = require('../services/menu');
const { requireAuth } = require('../middleware/auth');

module.exports = function menuRoutes(db, perms) {
  const router = express.Router();
  router.use(requireAuth);

  // What the main page shows for the signed-in person.
  router.get('/', async (req, res, next) => {
    try {
      const [modules, mine] = await Promise.all([
        rightsRepo.listModules(db),
        req.user.role === 'user' ? rightsRepo.listUserModuleCodes(db, req.user.user_id) : [],
      ]);
      res.json(buildMenu(req.user, modules, mine));
    } catch (err) {
      next(err);
    }
  });

  // Effective rights, so screens can hide buttons. The server still checks every action.
  router.get('/rights', async (req, res, next) => {
    try {
      const r = await perms.rightsOf(req.user);
      res.json(r.all ? { all: true, rights: [] } : { all: false, rights: [...r.codes].sort() });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
