'use strict';

const express = require('express');
const { registerUser } = require('../services/registration');
const { login, setPassword, passwordTokenStatus, requestPasswordReset, publicUser } = require('../services/authService');
const { COOKIE_NAME, SESSION_TTL_MS, createSessionToken, cookieOptions } = require('../services/session');
const { requireAuth } = require('../middleware/auth');
const { createMailer } = require('../services/mailer');
const { createGoogleVerifier, googleSignIn } = require('../services/googleAuth');
const { rateLimit } = require('../middleware/rateLimit');

module.exports = function authRoutes(db, config, { googleVerifier } = {}) {
  const verifyGoogle = googleVerifier || createGoogleVerifier(config.googleClientId);
  const router = express.Router();
  const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
  const mailer = createMailer(config);
  const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
  const statusLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
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
        // "Remember me" keeps the session longer; otherwise the normal 8-hour session applies.
        const ttl = req.body && req.body.remember === true ? (config.rememberDays || 7) * 24 * 60 * 60 * 1000 : SESSION_TTL_MS;
        const token = createSessionToken(user.user_id, config.sessionSecret, Date.now(), ttl);
        res.cookie(COOKIE_NAME, token, { ...cookieOptions(config), maxAge: ttl });
      }
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  });

  // The page asks which client ID to use; null means Google sign-in is not set up, so the button stays hidden.
  router.get('/google-config', (_req, res) => res.json({ clientId: config.googleClientId || null }));

  router.post('/google', loginLimiter, async (req, res, next) => {
    try {
      const { status, body, user } = await googleSignIn(db, verifyGoogle, req.body && req.body.credential);
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

  // Which screen should the link open: the form, "expired" or "already used"?
  router.get('/password-token', statusLimiter, async (req, res, next) => {
    try {
      res.json({ status: await passwordTokenStatus(db, String(req.query.token ?? '')) });
    } catch (err) {
      next(err);
    }
  });

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
