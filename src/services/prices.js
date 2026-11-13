'use strict';

const { validatePrice, parseDate } = require('../validators/price');
const { CODE_RE } = require('../validators/product');
const { auditName } = require('./rights');
const { isAdminRole } = require('./permissions');

const NO_PRODUCT = { status: 404, body: { error: 'Product not found.' } };
const NO_PRICE = { status: 404, body: { error: 'Price not found.' } };

const toItem = (r) => ({ effdate: r.effdate, price: Number(r.unitprice) });

function createPrices({ db, productRepo, repo, perms }) {
  // Prices belong to live products only.
  const liveProduct = async (client, code) => (CODE_RE.test(String(code)) ? productRepo.findProduct(client, code) : null);

  async function list(user, code) {
    const product = await liveProduct(db, code);
    if (!product) return NO_PRODUCT;
    const rows = await repo.listPrices(db, code);
    // Rows are newest first: the first one whose date has arrived is the price in force today.
    const currentIdx = rows.findIndex((r) => r.in_effect);
    const admin = isAdminRole(user);
    const [add, edit, del] = await Promise.all(['PRICE_ADD', 'PRICE_EDIT', 'PRICE_DELETE'].map((r) => perms.can(user, r)));
    return {
      status: 200,
      body: {
        product: { code: product.prodcode, description: String(product.description ?? '').trim(), unit: product.unit },
        prices: rows.map((r, i) => ({
          ...toItem(r),
          state: i === currentIdx ? 'current' : r.in_effect ? 'past' : 'scheduled',
          ...(admin ? { stamp: r.stamp || null } : {}),
        })),
        can: { add, edit, delete: del },
      },
    };
  }

  // Routes have already checked PRICE_ADD / PRICE_EDIT / PRICE_DELETE.
  async function create(actor, code, body) {
    const { errors, value } = validatePrice(body, { needDate: true });
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    try {
      return await db.txAs(auditName(actor), async (client) => {
        if (!(await liveProduct(client, code))) return NO_PRODUCT;
        const existing = await repo.findAnyPrice(client, code, value.effdate);
        if (existing && !existing.is_deleted) {
          return { status: 409, body: { errors: { effdate: 'This product already has a price for that date. Edit that price instead.' } } };
        }
        const row = existing
          ? await repo.reviveAndSetPrice(client, code, value.effdate, value.price) // a deleted price for the same date comes back with the new amount
          : await repo.insertPrice(client, code, value.effdate, value.price);
        return { status: 201, body: { price: toItem(row) } };
      });
    } catch (err) {
      if (err.code === '23505') return { status: 409, body: { errors: { effdate: 'This product already has a price for that date. Edit that price instead.' } } };
      throw err;
    }
  }

  async function update(actor, code, effdate, body) {
    const date = parseDate(effdate);
    if (!CODE_RE.test(String(code)) || !date) return NO_PRICE;
    const { errors, value } = validatePrice(body); // the date in the address is the one that counts
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    const row = await db.txAs(auditName(actor), (client) => repo.updatePrice(client, code, date, value.price));
    return row ? { status: 200, body: { price: toItem(row) } } : NO_PRICE;
  }

  async function remove(actor, code, effdate) {
    const date = parseDate(effdate);
    if (!CODE_RE.test(String(code)) || !date) return NO_PRICE;
    const row = await db.txAs(auditName(actor), (client) => repo.softDeletePrice(client, code, date));
    return row ? { status: 200, body: { price: toItem(row) } } : NO_PRICE;
  }

  return { list, create, update, remove };
}

module.exports = { createPrices };
