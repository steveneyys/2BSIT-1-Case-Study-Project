'use strict';

const { validatePayment } = require('../validators/payment');
const { manilaToday } = require('../validators/employee');
const { auditName } = require('./rights');
const { isAdminRole } = require('./permissions');
const { LIST_RIGHTS, clean } = require('./sales');

// No payment rights exist in the rights catalogue yet (open decision in the S4-UIX-02 notes), so payments follow the sales
// rights for now: seeing payments = seeing the Sales list, recording one = Edit Sale. When a payment right is added, change
// these two constants and the matching lines in the rights-matrix test; nothing else needs to move.
const VIEW_RIGHTS = LIST_RIGHTS;
const RECORD_RIGHT = 'SALE_EDIT';

const SORT_KEYS = ['orno', 'date', 'sale', 'amount'];
const STATUSES = ['active', 'deleted', 'all'];
const PAGE_SIZES = [10, 25, 50, 100];
const OPTION_LIMIT = 200;

const cents = (v) => Math.round(Number(v) * 100);
const money = (c) => c / 100;

function normalizeQuery(q = {}) {
  const search = String(q.search ?? '').trim().slice(0, 100);
  const status = STATUSES.includes(q.status) ? q.status : 'active';
  const sort = SORT_KEYS.includes(q.sort) ? q.sort : 'orno';
  const dir = q.dir === 'asc' ? 'asc' : 'desc'; // newest receipt first
  const pageSize = PAGE_SIZES.includes(Number(q.pageSize)) ? Number(q.pageSize) : 25;
  const page = Math.min(Math.max(Number.parseInt(q.page, 10) || 1, 1), 100000);
  return { search, status, sort, dir, pageSize, page };
}

const toItem = (r) => ({
  orno: r.orno, paydate: r.paydate || null, amount: r.amount == null ? null : Number(r.amount),
  transno: r.transno || null, custno: r.custno || null, customer: clean(r.custname),
});
const toAdminItem = (r) => ({ ...toItem(r), deleted: Boolean(r.is_deleted), status: r.is_deleted ? 'Inactive' : 'Active', stamp: r.stamp || null });

const balanceOf = (b) => cents(b.total) - cents(b.paid);

function createPayments({ db, repo, perms, today = manilaToday }) {
  async function list(user, query) {
    const n = normalizeQuery(query);
    const admin = isAdminRole(user);
    const scope = admin ? n.status : 'active'; // only Admins may look at inactive payments
    const rows = await repo.listPayments(db, { search: n.search, scope, sort: n.sort, dir: n.dir, limit: n.pageSize, offset: (n.page - 1) * n.pageSize });
    const total = rows.length ? Number(rows[0].total_rows) : 0;
    const counts = admin ? await repo.countPayments(db) : undefined;
    return {
      status: 200,
      body: {
        payments: rows.map(admin ? toAdminItem : toItem),
        status: scope,
        counts,
        total,
        page: n.page,
        pageSize: n.pageSize,
        pages: Math.max(1, Math.ceil(total / n.pageSize)),
        can: { record: await perms.can(user, RECORD_RIGHT), seeDeleted: admin },
      },
    };
  }

  // Choices for the Record Payment form: the next receipt number to suggest and the sales that still have a balance.
  async function options(query = {}) {
    const search = String(query.search ?? '').trim().slice(0, 100);
    const [orno, sales] = await Promise.all([repo.suggestOrNo(db), repo.listPayableSales(db, { search, limit: OPTION_LIMIT })]);
    return {
      status: 200,
      body: {
        orno,
        today: today(),
        sales: sales.map((s) => ({
          transno: s.transno, salesdate: s.salesdate, custno: s.custno, customer: clean(s.custname),
          total: money(cents(s.total)), paid: money(cents(s.paid)), balance: money(balanceOf(s)), complete: Number(s.unpriced) === 0,
        })),
      },
    };
  }

  const TAKEN = { status: 409, body: { errors: { orno: 'That receipt number is already used.' } } };
  const TAKEN_DELETED = { status: 409, body: { errors: { orno: 'That receipt number belongs to an inactive payment. Use another number.' } } };

  async function create(actor, body) {
    const { errors, value } = validatePayment(body, { today: today() });
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    try {
      return await db.txAs(auditName(actor), async (client) => {
        await repo.lockSalePayments(client, value.transno);
        const taken = await repo.findAnyPayment(client, value.orno);
        if (taken) return taken.is_deleted ? TAKEN_DELETED : TAKEN;
        const sale = await repo.findSaleBalance(client, value.transno);
        if (!sale) return { status: 400, body: { errors: { transno: 'That sale does not exist or is deleted. Choose another.' } } };
        if (Number(sale.unpriced) > 0) {
          return { status: 409, body: { errors: { transno: 'Some lines of this sale have no price on its sales date, so its balance cannot be worked out. Fix the lines first.' } } };
        }
        const balance = balanceOf(sale);
        if (balance <= 0) return { status: 409, body: { errors: { transno: 'This sale has no balance left to pay.' } } };
        if (cents(value.amount) > balance) {
          return { status: 400, body: { errors: { amount: `The amount is more than the balance of this sale (${money(balance).toFixed(2)}). Enter the balance or less.` } } };
        }
        const row = await repo.insertPayment(client, value);
        return { status: 201, body: { payment: toItem({ ...row, custno: sale.custno, custname: sale.custname }), balance: money(balance - cents(value.amount)) } };
      });
    } catch (err) {
      if (err.code === '23505') return TAKEN; // same receipt number saved at the same moment
      throw err;
    }
  }

  return { list, options, create };
}

module.exports = { createPayments, normalizeQuery, VIEW_RIGHTS, RECORD_RIGHT, toItem, balanceOf };
