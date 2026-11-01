'use strict';

const userRepo = require('../repositories/userRepo');
const { COOKIE_NAME, parseCookies, verifySessionToken } = require('../services/session');

// Attaches req.user if the session cookie is valid AND the account is still allowed to sign in.
// Re-reading the user on every request means "Block" and role changes take effect immediately.
function attachUser(db, config) {
  return async (req, _res, next) => {
    try {
      const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
      const userId = verifySessionToken(token, config.sessionSecret);
      if (userId !== null) {
        const user = await userRepo.findById(db, userId);
        if (user && !user.is_blocked && user.status === 'active') req.user = user;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  next();
}

// Usage later: router.get('/x', requireAuth, requireRole('admin', 'superadmin'), handler)
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'You do not have access to this.' });

module.exports = { attachUser, requireAuth, requireRole };
