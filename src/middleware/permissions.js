'use strict';

// Usage in a router (later sprints), after requireAuth:
//   router.post('/', requireRight(perms, 'CUST_ADD'), handler)
// A user holding at least one of the listed rights passes; admins and superadmins always pass.
// Right codes come from the right_catalog table.
function requireRight(perms, ...codes) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
      if (!(await perms.can(req.user, ...codes))) {
        return res.status(403).json({ error: 'You do not have the right to do this.' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireRight };
