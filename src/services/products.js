'use strict';

const { validateProduct, UNITS, CODE_RE } = require('../validators/product');
const { auditName } = require('./rights');
const { isAdminRole } = require('./permissions');
const STATUSES = ['active', 'deleted', 'all'];
const SORT_KEYS = ['code', 'description', 'unit', 'price'];
const PAGE_SIZES = [10, 25, 50, 100];
// Holding any product or price right opens the module (the same rule the menu uses).
const VIEW_RIGHTS = ['PROD_ADD', 'PROD_EDIT', 'PROD_DELETE', 'PRICE_ADD', 'PRICE_EDIT', 'PRICE_DELETE'];

function normalizeQuery(q = {}) {
  const search = String(q.search ?? '').trim().slice(0, 100);
  const unit = UNITS.includes(String(q.unit ?? '').toLowerCase()) ? String(q.unit).toLowerCase() : null;
  const status = STATUSES.includes(q.status) ? q.status : 'active';
  const sort = SORT_KEYS.includes(q.sort) ? q.sort : 'description';
  const dir = q.dir === 'desc' ? 'desc' : 'asc';
  const pageSize = PAGE_SIZES.includes(Number(q.pageSize)) ? Number(q.pageSize) : 25;
  const page = Math.min(Math.max(Number.parseInt(q.page, 10) || 1, 1), 100000);
  return { search, unit, status, sort, dir, pageSize, page };
}

// Price comes from the database as text ("1250.50"); the screen gets a number or null (no price yet).
const toItem = (r) => ({
  code: r.prodcode,
  description: String(r.description ?? '').trim(),
  unit: r.unit,
  price: r.unitprice === null || r.unitprice === undefined ? null : Number(r.unitprice),
  priceDate: r.effdate || null,
});

// Admins and superadmins also see the Status and the Stamp; everyone else gets neither.
const toAdminItem = (r) => ({ ...toItem(r), deleted: Boolean(r.is_deleted), status: r.is_deleted ? 'Inactive' : 'Active', stamp: r.stamp || null });

const blockedBy = (name, { prices, lines }) => {
  const parts = [];
  if (prices) parts.push(`${prices} price${prices === 1 ? '' : 's'}`);
  if (lines) parts.push(`${lines} sale line${lines === 1 ? '' : 's'}`);
  return {
    status: 409,
    body: { error: `${name} still has ${parts.length ? parts.join(' and ') : 'active prices or sales'}, so it cannot be deleted. Remove them first.` },
  };
};

const NOT_FOUND = { status: 404, body: { error: 'Product not found.' } };
const toBasic = (r) => ({ code: r.prodcode, description: String(r.description ?? '').trim(), unit: r.unit });

const takenResponse = (row) => ({
  status: 409,
  body: {
    errors: {
      code: row.is_deleted
        ? 'That code belongs to a deleted product. An Admin can restore it, or choose another code.'
        : 'That product code is already in use.',
    },
  },
});

function createProducts({ db, repo, perms }) {
  async function list(user, query) {
    const n = normalizeQuery(query);
    const admin = isAdminRole(user);
    const scope = admin ? n.status : 'active'; // only Admins may look at deleted products
    const rows = await repo.listProducts(db, {
      search: n.search, unit: n.unit, scope, sort: n.sort, dir: n.dir,
      limit: n.pageSize, offset: (n.page - 1) * n.pageSize,
    });
    const total = rows.length ? Number(rows[0].total) : 0;
    const [addP, editP, delP, addPr, editPr, delPr] = await Promise.all(
      ['PROD_ADD', 'PROD_EDIT', 'PROD_DELETE', 'PRICE_ADD', 'PRICE_EDIT', 'PRICE_DELETE'].map((r) => perms.can(user, r))
    );
    const counts = admin ? await repo.countProducts(db) : undefined;
    return {
      status: 200,
      body: {
        products: rows.map(admin ? toAdminItem : toItem),
        status: scope,
        counts,
        total,
        page: n.page,
        pageSize: n.pageSize,
        pages: Math.max(1, Math.ceil(total / n.pageSize)),
        // Lets the screen show or hide buttons later. The server still checks every action.
        can: { add: addP, edit: editP, delete: delP, restore: admin, seeDeleted: admin, addPrice: addPr, editPrice: editPr, deletePrice: delPr },
      },
    };
  }
  async function get(code) {
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    const row = await repo.findProduct(db, code);
    return row ? { status: 200, body: { product: toBasic(row) } } : NOT_FOUND;
  }

  // The route has already checked PROD_ADD / PROD_EDIT. The audit log and the Stamp column name the real person.
  async function create(actor, body) {
    const { errors, value } = validateProduct(body, { needCode: true });
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    try {
      return await db.txAs(auditName(actor), async (client) => {
        const taken = await repo.findAnyProduct(client, value.code);
        if (taken) return takenResponse(taken);
        return { status: 201, body: { product: toBasic(await repo.insertProduct(client, value)) } };
      });
    } catch (err) {
      if (err.code === '23505') return takenResponse({ is_deleted: false }); // two people adding the same code at once
      throw err;
    }
  }

  async function update(actor, code, body) {
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    const { errors, value } = validateProduct(body); // any "code" in the body is ignored
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    const row = await db.txAs(auditName(actor), (client) => repo.updateProduct(client, code, value));
    return row ? { status: 200, body: { product: toBasic(row) } } : NOT_FOUND;
  }

  async function remove(actor, code) {
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    try {
      return await db.txAs(auditName(actor), async (client) => {
        const row = await repo.findProduct(client, code);
        if (!row) return NOT_FOUND;
        // Friendly check first; the database trigger is the final guard if a price or sale appears in between.
        const kids = await repo.countActiveChildren(client, code);
        if (kids.prices || kids.lines) return blockedBy(toBasic(row).description, kids);
        const done = await repo.softDeleteProduct(client, code);
        return done ? { status: 200, body: { product: toBasic(done) } } : NOT_FOUND;
      });
    } catch (err) {
      if (/Cannot delete product/i.test(String(err.message))) return blockedBy('This product', {});
      throw err;
    }
  }

  async function restore(actor, code) {
    if (!isAdminRole(actor)) return { status: 403, body: { error: 'Only an Admin can restore a product.' } };
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    const row = await db.txAs(auditName(actor), (client) => repo.restoreProduct(client, code));
    return row ? { status: 200, body: { product: toBasic(row) } } : NOT_FOUND;
  }

  return { list, get, create, update, remove, restore };
}

module.exports = { createProducts, normalizeQuery, VIEW_RIGHTS, UNITS };
