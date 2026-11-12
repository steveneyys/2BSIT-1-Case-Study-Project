'use strict';

const path = require('node:path');
const { attachUser } = require('./auth');

// Protected pages. Without this, anyone could download users.html and read its code; the data would still be
// protected by the API, but pages should not be served to people who may not use them.
//   roles: null          -> any signed-in user
//   roles: ['admin',...] -> only those roles
//   rights: ['CUST_ADD',...] -> also needs at least one of these rights (admins and superadmins always pass)
// Add a line here for each new screen (Sprint 2+).
const PAGE_RULES = {
  '/home.html': { roles: null },
  '/users.html': { roles: ['admin', 'superadmin'] },
  '/user-form.html': { roles: ['admin', 'superadmin'] },
  '/customers.html': { roles: null, rights: ['CUST_ADD', 'CUST_EDIT', 'CUST_DELETE'] },
  '/products.html': { roles: null, rights: ['PROD_ADD', 'PROD_EDIT', 'PROD_DELETE', 'PRICE_ADD', 'PRICE_EDIT', 'PRICE_DELETE'] },
};

// Same page, different spelling: /USERS.HTML, /%75sers.html, //users.html, /a/../users.html.
// The static file server accepts all of them (it decodes and, on Windows, ignores case), so match on the
// cleaned-up form or the rule can be bypassed.
function normalize(rawPath) {
  let p;
  try {
    p = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  return path.posix.normalize(`/${p}`).replace(/\/{2,}/g, '/').toLowerCase();
}

function guardPages(db, config, rules = PAGE_RULES, perms = null) {
  const load = attachUser(db, config);
  return (req, res, next) => {
    const key = normalize(req.path);
    if (key === null) return res.status(400).send('Bad request');
    const rule = rules[key];
    if (!rule) return next();
    load(req, res, async (err) => {
      if (err) return next(err);
      if (!req.user) return res.redirect(302, '/login.html');
      if (rule.roles && !rule.roles.includes(req.user.role)) return res.redirect(302, '/home.html');
      try {
        // A page that needs rights is refused when the rights cannot be checked (fail closed).
        if (rule.rights && !(perms && (await perms.can(req.user, ...rule.rights)))) return res.redirect(302, '/home.html');
      } catch (e) {
        return next(e);
      }
      res.set('Cache-Control', 'no-store');
      next();
    });
  };
}

module.exports = { guardPages, normalize, PAGE_RULES };
