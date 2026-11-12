'use strict';

const { validateCustomer, PAYTERMS } = require('../validators/customer');
const { auditName } = require('./rights');
const { isAdminRole } = require('./permissions');
const SORT_KEYS = ['name', 'code', 'term'];
const STATUSES = ['active', 'deleted', 'all'];
const PAGE_SIZES = [10, 25, 50, 100];
const VIEW_RIGHTS = ['CUST_ADD', 'CUST_EDIT', 'CUST_DELETE']; // holding any customer right opens the module

// Turns whatever the browser sent into safe, bounded values. Unknown values fall back to defaults.
function normalizeQuery(q = {}) {
  const search = String(q.search ?? '').trim().slice(0, 100);
  const payterm = PAYTERMS.includes(String(q.payterm ?? '').toUpperCase()) ? String(q.payterm).toUpperCase() : null;
  const status = STATUSES.includes(q.status) ? q.status : 'active';
  const sort = SORT_KEYS.includes(q.sort) ? q.sort : 'name';
  const dir = q.dir === 'desc' ? 'desc' : 'asc';
  const pageSize = PAGE_SIZES.includes(Number(q.pageSize)) ? Number(q.pageSize) : 25;
  const page = Math.min(Math.max(Number.parseInt(q.page, 10) || 1, 1), 100000);
  return { search, payterm, status, sort, dir, pageSize, page };
}

const toItem = (r) => ({ code: r.custno, name: r.custname, address: r.address, payterm: r.payterm });
// Admins and superadmins also see the Status and the Stamp (guide, section 3.3); everyone else gets neither.
const toAdminItem = (r) => ({ ...toItem(r), deleted: Boolean(r.is_deleted), status: r.is_deleted ? 'Inactive' : 'Active', stamp: r.stamp || null });

const NOT_FOUND = { status: 404, body: { error: 'Customer not found.' } };
const CODE_RE = /^C\d{4}$/;
const blockedBySales = (name, n) => ({
  status: 409,
  body: { error: `${name} has ${n ? `${n} active sale${n === 1 ? '' : 's'}` : 'active sales'}, so it cannot be deleted.` },
});

function createCustomers({ db, repo, perms }) {
  async function list(user, query) {
    const n = normalizeQuery(query);
    const admin = isAdminRole(user);
    const scope = admin ? n.status : 'active'; // only Admins may look at deleted customers
    const rows = await repo.listCustomers(db, {
      search: n.search, payterm: n.payterm, scope, sort: n.sort, dir: n.dir,
      limit: n.pageSize, offset: (n.page - 1) * n.pageSize,
    });
    const total = rows.length ? Number(rows[0].total) : 0;
    const [canAdd, canEdit, canDelete] = await Promise.all([
      perms.can(user, 'CUST_ADD'), perms.can(user, 'CUST_EDIT'), perms.can(user, 'CUST_DELETE'),
    ]);
    const counts = admin ? await repo.countCustomers(db) : undefined;
    return {
      status: 200,
      body: {
        customers: rows.map(admin ? toAdminItem : toItem),
        status: scope,
        counts,
        total,
        page: n.page,
        pageSize: n.pageSize,
        pages: Math.max(1, Math.ceil(total / n.pageSize)),
        // Lets the screen show or hide buttons. The server still checks every action.
        can: { add: canAdd, edit: canEdit, delete: canDelete, restore: admin, seeDeleted: admin },
      },
    };
  }
  async function get(code) {
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    const row = await repo.findCustomer(db, code);
    return row ? { status: 200, body: { customer: toItem(row) } } : NOT_FOUND;
  }

  // The route has already checked CUST_ADD / CUST_EDIT. The audit log and the Stamp column name the real person.
  async function create(actor, body) {
    const { errors, value } = validateCustomer(body);
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    try {
      const row = await db.txAs(auditName(actor), (client) => repo.insertCustomer(client, value));
      return { status: 201, body: { customer: toItem(row) } };
    } catch (err) {
      if (err.code === 'CODE_EXHAUSTED') return { status: 409, body: { error: 'No more customer codes are available.' } };
      throw err;
    }
  }

  async function update(actor, code, body) {
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    const { errors, value } = validateCustomer(body); // any "code" in the body is ignored
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    const row = await db.txAs(auditName(actor), (client) => repo.updateCustomer(client, code, value));
    return row ? { status: 200, body: { customer: toItem(row) } } : NOT_FOUND;
  }

  async function remove(actor, code) {
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    try {
      return await db.txAs(auditName(actor), async (client) => {
        const row = await repo.findCustomer(client, code);
        if (!row) return NOT_FOUND;
        // Friendly check first; the database trigger is the final guard if a sale appears in between.
        const sales = await repo.countActiveSales(client, code);
        if (sales > 0) return blockedBySales(row.custname, sales);
        const done = await repo.softDeleteCustomer(client, code);
        return done ? { status: 200, body: { customer: toItem(done) } } : NOT_FOUND;
      });
    } catch (err) {
      if (/Cannot delete customer/i.test(String(err.message))) return blockedBySales('This customer');
      throw err;
    }
  }

  async function restore(actor, code) {
    if (!isAdminRole(actor)) return { status: 403, body: { error: 'Only an Admin can restore a customer.' } };
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    const row = await db.txAs(auditName(actor), (client) => repo.restoreCustomer(client, code));
    return row ? { status: 200, body: { customer: toItem(row) } } : NOT_FOUND;
  }

  return { list, get, create, update, remove, restore };
}

module.exports = { createCustomers, normalizeQuery, VIEW_RIGHTS, PAYTERMS };
