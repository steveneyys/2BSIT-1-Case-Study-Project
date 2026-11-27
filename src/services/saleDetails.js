'use strict';

const { validateLine, PROD_RE } = require('../validators/saleDetail');
const { auditName } = require('./rights');
const { isAdminRole } = require('./permissions');
const { TRANS_RE } = require('../validators/sale');
const { clean, personName } = require('./sales');

const cents = (v) => Math.round(Number(v) * 100);
const fromCents = (c) => c / 100;

// Unit price = price in force on the sale date (null when none). Line amount = quantity x unit price.
const toItem = (r) => {
  const quantity = Number(r.quantity);
  const price = r.unitprice == null ? null : Number(r.unitprice);
  return {
    prodcode: r.prodcode, product: clean(r.description) || r.prodcode, unit: clean(r.unit) || null,
    quantity, unitprice: price, amount: price == null ? null : fromCents(cents(price) * quantity),
  };
};
const toAdminItem = (r) => ({ ...toItem(r), deleted: Boolean(r.is_deleted), status: r.is_deleted ? 'Inactive' : 'Active', stamp: r.stamp || null });

const NOT_FOUND = { status: 404, body: { error: 'Sale not found.' } };
const LINE_NOT_FOUND = { status: 404, body: { error: 'Sale line not found.' } };
const SALE_DELETED = { status: 409, body: { error: 'This sale is deleted. Restore the sale first.' } };
const badKey = (transno, prodcode) => !TRANS_RE.test(String(transno)) || !PROD_RE.test(String(prodcode));
const noPrice = (date) => `No applicable price for this sale date. A price effective on or before ${date} is required. Do not save this line at ₱0.00.`;
const SAME_PRODUCT = { status: 409, body: { errors: { prodcode: 'This sale already has a line for that product. Edit that line instead.' } } };
const DELETED_SAME = { status: 409, body: { errors: { prodcode: 'A deleted line for this product exists. An Admin can restore it, or choose another product.' } } };

function createSaleDetails({ db, repo, saleRepo, perms }) {
  async function view(user, transno) {
    if (!TRANS_RE.test(String(transno))) return NOT_FOUND;
    const admin = isAdminRole(user);
    const sale = await saleRepo.findSale(db, transno);
    if (!sale || (sale.is_deleted && !admin)) return NOT_FOUND; // only Admins can look at a deleted sale
    const rows = await repo.listLines(db, transno, { includeDeleted: admin });
    const live = rows.filter((r) => !r.is_deleted);
    // Total = active lines only. A line with no price on the sale date adds nothing and is counted, never guessed.
    const total = live.reduce((sum, r) => sum + (r.unitprice == null ? 0 : cents(r.unitprice) * Number(r.quantity)), 0);
    const [canAdd, canEdit, canDelete] = await Promise.all([
      perms.can(user, 'SALEDET_ADD'), perms.can(user, 'SALEDET_EDIT'), perms.can(user, 'SALEDET_DELETE'),
    ]);
    const open = !sale.is_deleted;
    let options;
    if (open && (canAdd || canEdit)) {
      options = (await repo.listProducts(db, sale.salesdate)).map((p) => ({
        prodcode: p.prodcode, product: clean(p.description) || p.prodcode, unit: clean(p.unit) || null, unitprice: p.unitprice == null ? null : Number(p.unitprice),
      }));
    }
    return {
      status: 200,
      body: {
        sale: { transno: sale.transno, salesdate: sale.salesdate, custno: sale.custno, customer: clean(sale.custname), empno: sale.empno, employee: personName(sale), deleted: Boolean(sale.is_deleted) },
        lines: rows.map(admin ? toAdminItem : toItem),
        total: fromCents(total),
        unpriced: live.filter((r) => r.unitprice == null).length,
        options,
        // Lets the screen show or hide buttons. The server still checks every action.
        can: { add: canAdd && open, edit: canEdit && open, delete: canDelete && open, restore: admin && open, seeDeleted: admin },
      },
    };
  }

  // Shape check plus: the sale is live, the product is live and has a price on the sale date, one live line per product.
  async function check(client, transno, body, except = null) {
    const sale = await saleRepo.findSale(client, transno);
    if (!sale) return { fail: NOT_FOUND };
    if (sale.is_deleted) return { fail: SALE_DELETED };
    const { errors, value } = validateLine(body);
    if (!errors.prodcode) {
      const product = await repo.findProduct(client, value.prodcode, sale.salesdate);
      if (!product) errors.prodcode = 'That product does not exist or is deleted. Choose another.';
      else if (product.unitprice == null) errors.prodcode = noPrice(sale.salesdate);
    }
    if (Object.keys(errors).length) return { fail: { status: 400, body: { errors } } };
    if (await repo.findLiveLine(client, transno, value.prodcode, except)) return { fail: SAME_PRODUCT };
    return { value };
  }

  async function create(actor, transno, body) {
    if (!TRANS_RE.test(String(transno))) return NOT_FOUND;
    try {
      return await db.txAs(auditName(actor), async (client) => {
        await repo.lockSale(client, transno);
        const r = await check(client, transno, body);
        if (r.fail) return r.fail;
        if (await repo.findLine(client, transno, r.value.prodcode)) return DELETED_SAME; // only a deleted line can be left now
        return { status: 201, body: { line: toItem(await repo.insertLine(client, transno, r.value)) } };
      });
    } catch (err) {
      if (err.code === '23505') return SAME_PRODUCT; // same line added at the same moment
      throw err;
    }
  }

  async function update(actor, transno, prodcode, body) {
    if (badKey(transno, prodcode)) return LINE_NOT_FOUND;
    try {
      return await db.txAs(auditName(actor), async (client) => {
        await repo.lockSale(client, transno);
        const current = await repo.findLine(client, transno, prodcode);
        if (!current || current.is_deleted) return LINE_NOT_FOUND;
        const r = await check(client, transno, body, prodcode);
        if (r.fail) return r.fail;
        if (r.value.prodcode !== prodcode && (await repo.findLine(client, transno, r.value.prodcode))) return DELETED_SAME;
        const row = await repo.updateLine(client, transno, prodcode, r.value);
        return row ? { status: 200, body: { line: toItem(row) } } : LINE_NOT_FOUND;
      });
    } catch (err) {
      if (err.code === '23505') return SAME_PRODUCT;
      throw err;
    }
  }

  async function remove(actor, transno, prodcode) {
    if (badKey(transno, prodcode)) return LINE_NOT_FOUND;
    return db.txAs(auditName(actor), async (client) => {
      await repo.lockSale(client, transno);
      const sale = await saleRepo.findSale(client, transno);
      if (!sale) return NOT_FOUND;
      if (sale.is_deleted) return SALE_DELETED;
      const row = await repo.softDeleteLine(client, transno, prodcode);
      return row ? { status: 200, body: { line: toItem(row) } } : LINE_NOT_FOUND;
    });
  }

  async function restore(actor, transno, prodcode) {
    if (!isAdminRole(actor)) return { status: 403, body: { error: 'Only an Admin can restore a sale line.' } };
    if (badKey(transno, prodcode)) return LINE_NOT_FOUND;
    try {
      return await db.txAs(auditName(actor), async (client) => {
        await repo.lockSale(client, transno);
        const sale = await saleRepo.findSale(client, transno);
        if (!sale) return NOT_FOUND;
        if (sale.is_deleted) return SALE_DELETED;
        const gone = await repo.findLine(client, transno, prodcode);
        if (!gone || !gone.is_deleted) return LINE_NOT_FOUND;
        const product = await repo.findProduct(client, prodcode, sale.salesdate);
        if (!product) return { status: 409, body: { error: 'The product of this line is deleted. Restore the product first.' } };
        const row = await repo.restoreLine(client, transno, prodcode);
        return row ? { status: 200, body: { line: toItem(row) } } : LINE_NOT_FOUND;
      });
    } catch (err) {
      if (/Restore it first/i.test(String(err.message))) return { status: 409, body: { error: 'The product of this line is deleted. Restore the product first.' } };
      throw err;
    }
  }

  // Someone with Add, Edit or Delete but without View Sale Details must not learn prices or amounts from a reply:
  // they get the line's key back, nothing else.
  async function scrub(actor, result) {
    const line = result.body && result.body.line;
    if (!line || (await perms.can(actor, 'SALEDET_VIEW'))) return result;
    return { ...result, body: { line: { prodcode: line.prodcode } } };
  }
  const guarded = (fn) => async (actor, ...args) => scrub(actor, await fn(actor, ...args));

  return { view, create: guarded(create), update: guarded(update), remove: guarded(remove), restore: guarded(restore) };
}

module.exports = { createSaleDetails, toItem };
