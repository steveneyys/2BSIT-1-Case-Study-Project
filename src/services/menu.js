'use strict';

const { isAdminRole } = require('./permissions');

// Pages that exist for each module, keyed by lower-case module_code (see the module table).
// Fill these in as the module screens are built in Sprints 2 to 4, for example:
//   customer: '/customers.html'
// A module without a page shows as a "coming soon" tile.
const MODULE_PAGES = {};

const ADMIN_ITEMS = [{ key: 'users', label: 'User Management', href: '/users.html' }];

// Builds what the main page shows. The browser only draws it; what is offered here is decided by the server.
function buildMenu(user, modules, userModuleCodes) {
  const admin = isAdminRole(user);
  const visible = admin ? modules : modules.filter((m) => userModuleCodes.includes(m.module_code));
  return {
    user: { firstName: user.first_name, lastName: user.last_name, email: user.email, role: user.role },
    modules: visible.map((m) => ({
      code: m.module_code,
      name: m.module_name,
      href: MODULE_PAGES[String(m.module_code).toLowerCase()] || null,
    })),
    admin: admin ? ADMIN_ITEMS : [],
  };
}

module.exports = { buildMenu, MODULE_PAGES };
