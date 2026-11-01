'use strict';

const express = require('express');
const { registerUser } = require('../services/registration');
const { rateLimit } = require('../middleware/rateLimit');

module.exports = function authRoutes(db) {
  const router = express.Router();
  const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

  // POST /api/auth/register  (login/logout/reset are added in S1-DEV-03 and S1-DEV-04)
  router.post('/register', registerLimiter, async (req, res, next) => {
    try {
      const { status, body } = await registerUser(db, req.body);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
