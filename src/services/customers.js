'use strict';

const PAYTERMS = ['COD', '30D', '45D'];
const SORT_KEYS = ['name', 'code', 'term'];
const PAGE_SIZES = [10, 25, 50, 100];
const VIEW_RIGHTS = ['CUST_ADD', 'CUST_EDIT', 'CUST_DELETE']; // holding any customer right opens the module

// Turns whatever the browser sent into safe, bounded values. Unknown values fall back to defaults.
function normalizeQuery(q = {}) {
  const search = String(q.search ?? '').trim().slice(0, 100);
  const payterm = PAYTERMS.includes(String(q.payterm ?? '').toUpperCase()) ? String(q.payterm).toUpperCase() : null;
  const sort = SORT_KEYS.includes(q.sort) ? q.sort : 'name';
  const dir = q.dir === 'desc' ? 'desc' : 'asc';
  const pageSize = PAGE_SIZES.includes(Number(q.pageSize)) ? Number(q.pageSize) : 25;
  const page = Math.min(Math.max(Number.parseInt(q.page, 10) || 1, 1), 100000);
  return { search, payterm, sort, dir, pageSize, page };
}

const toItem = (r) => ({ code: r.custno, name: r.custname, address: r.address, payterm: r.payterm });

function createCustomers({ db, repo, perms }) {
  async function list(user, query) {
    const n = normalizeQuery(query);
    const rows = await repo.listCustomers(db, {
      search: n.search, payterm: n.payterm, sort: n.sort, dir: n.dir,
      limit: n.pageSize, offset: (n.page - 1) * n.pageSize,
    });
    const total = rows.length ? Number(rows[0].total) : 0;
    const [canAdd, canEdit, canDelete] = await Promise.all([
      perms.can(user, 'CUST_ADD'), perms.can(user, 'CUST_EDIT'), perms.can(user, 'CUST_DELETE'),
    ]);
    return {
      status: 200,
      body: {
        customers: rows.map(toItem),
        total,
        page: n.page,
        pageSize: n.pageSize,
        pages: Math.max(1, Math.ceil(total / n.pageSize)),
        // Lets the screen show or hide buttons. The server still checks every action.
        can: { add: canAdd, edit: canEdit, delete: canDelete },
      },
    };
  }
  return { list };
}

module.exports = { createCustomers, normalizeQuery, VIEW_RIGHTS, PAYTERMS };
