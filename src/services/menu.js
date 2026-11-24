'use strict';

const { isAdminRole } = require('./permissions');

// Pages that exist for each module, keyed by lower-case module_code (see the module table).
// Fill these in as the module screens are built in Sprints 2 to 4, for example:
//   customer: '/customers.html'
// A module without a page shows as a "coming soon" tile.
const MODULE_PAGES = {
  customer: '/customers.html',
  product: '/products.html',
  hr: '/departments.html', // default; see MODULE_SUBPAGES for the pages inside Human Resources
};

// A module with several screens: the tile opens the first screen the person has a right for, and every screen
// keeps the module tab highlighted. Employees joined in S3-DEV-03.
const MODULE_SUBPAGES = {
  hr: [
    { href: '/departments.html', rights: ['DEPT_ADD', 'DEPT_EDIT', 'DEPT_DELETE'] },
    { href: '/jobs.html', rights: ['JOB_ADD', 'JOB_EDIT', 'JOB_DELETE'] },
    { href: '/employees.html', rights: ['EMP_ADD', 'EMP_EDIT', 'EMP_DELETE'] },
  ],
};

const ADMIN_ITEMS = [{ key: 'users', label: 'User Management', href: '/users.html' }];

// Builds what the main page shows. The browser only draws it; what is offered here is decided by the server.
// `rights` is optional ({ all, codes }); without it a module with several screens opens on its first screen.
function buildMenu(user, modules, userModuleCodes, rights = null) {
  const admin = isAdminRole(user);
  const visible = admin ? modules : modules.filter((m) => userModuleCodes.includes(m.module_code));
  return {
    user: { firstName: user.first_name, lastName: user.last_name, email: user.email, role: user.role },
    modules: visible.map((m) => {
      const key = String(m.module_code).toLowerCase();
      const subpages = MODULE_SUBPAGES[key];
      let href = MODULE_PAGES[key] || null;
      if (subpages && rights) {
        const first = subpages.find((p) => rights.all || p.rights.some((r) => rights.codes.has(r)));
        if (first) href = first.href;
      }
      return { code: m.module_code, name: m.module_name, href, ...(subpages ? { pages: subpages.map((p) => p.href) } : {}) };
    }),
    admin: admin ? ADMIN_ITEMS : [],
  };
}

module.exports = { buildMenu, MODULE_PAGES, MODULE_SUBPAGES };
