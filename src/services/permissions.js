'use strict';

// One place that answers "may this person do X?". Rules:
//   superadmin and admin: everything (they have all rights implicitly)
//   user:                 only the rights ticked for them in the Rights dialog (user_permission)
// Routes must call this on the SERVER. Hiding a button is a courtesy, not a check.

const isAdminRole = (user) => user.role === 'admin' || user.role === 'superadmin';

function createPermissions({ db, repo }) {
  async function rightsOf(user) {
    if (isAdminRole(user)) return { all: true, codes: new Set() };
    return { all: false, codes: new Set(await repo.listUserRights(db, user.user_id)) };
  }

  // True if the user holds AT LEAST ONE of the listed right codes.
  async function can(user, ...codes) {
    if (!user) return false;
    const r = await rightsOf(user);
    return r.all || codes.some((c) => r.codes.has(c));
  }

  return { rightsOf, can };
}

module.exports = { createPermissions, isAdminRole };
