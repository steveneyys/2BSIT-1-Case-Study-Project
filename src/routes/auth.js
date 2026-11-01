'use strict';

const express = require('express');
const { registerUser } = require('../services/registration');
const { login, setPassword, requestPasswordReset, publicUser } = require('../services/authService');
const { COOKIE_NAME, SESSION_TTL_MS, createSessionToken, cookieOptions } = require('../services/session');
const { requireAuth } = require('../middleware/auth');
const { createMailer } = require('../services/mailer');
const { rateLimit } = require('../middleware/rateLimit');

module.exports = function authRoutes(db, config) {
  const router = express.Router();
  const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
  const mailer = createMailer(config);
  const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
  const tokenLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

  router.post('/register', registerLimiter, async (req, res, next) => {
    try {
      const { status, body } = await registerUser(db, req.body);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  });

  router.post('/login', loginLimiter, async (req, res, next) => {
    try {
      const { status, body, user } = await login(db, req.body || {});
      if (user) {
        const token = createSessionToken(user.user_id, config.sessionSecret);
        res.cookie(COOKIE_NAME, token, { ...cookieOptions(config), maxAge: SESSION_TTL_MS });
      }
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(COOKIE_NAME, cookieOptions(config));
    res.json({ message: 'Signed out.' });
  });

  router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

  router.post('/set-password', tokenLimiter, async (req, res, next) => {
    try {
      const { status, body } = await setPassword(db, req.body || {});
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  });

  router.post('/forgot-password', forgotLimiter, async (req, res, next) => {
    try {
      const { status, body } = await requestPasswordReset(db, req.body || {}, { mailer, appUrl: config.appUrl });
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
