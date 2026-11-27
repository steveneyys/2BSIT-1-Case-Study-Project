'use strict';

const { validateSale, TRANS_RE } = require('../validators/sale');
const { manilaToday } = require('../validators/employee');
const { auditName } = require('./rights');
const { isAdminRole } = require('./permissions');

const SORT_KEYS = ['transno', 'date', 'customer', 'employee'];
const STATUSES = ['active', 'deleted', 'all'];
const PAGE_SIZES = [10, 25, 50, 100];
// Any sales right opens the Sales screen. Seeing the list needs one of LIST_RIGHTS (the header rights, or View Sale Details).
// Changing anything still needs the matching right, checked per route.
const VIEW_RIGHTS = ['SALE_ADD', 'SALE_EDIT', 'SALE_DELETE', 'SALEDET_VIEW', 'SALEDET_ADD', 'SALEDET_EDIT', 'SALEDET_DELETE'];
const LIST_RIGHTS = ['SALE_ADD', 'SALE_EDIT', 'SALE_DELETE', 'SALEDET_VIEW'];

function normalizeQuery(q = {}) {
  const search = String(q.search ?? '').trim().slice(0, 100);
  const status = STATUSES.includes(q.status) ? q.status : 'active';
  const sort = SORT_KEYS.includes(q.sort) ? q.sort : 'transno';
  const dir = q.dir === 'desc' ? 'desc' : 'asc';
  const pageSize = PAGE_SIZES.includes(Number(q.pageSize)) ? Number(q.pageSize) : 25;
  const page = Math.min(Math.max(Number.parseInt(q.page, 10) || 1, 1), 100000);
  return { search, status, sort, dir, pageSize, page };
}

const clean = (v) => String(v ?? '').trim();
const personName = (r) => [clean(r.lastname), clean(r.firstname)].filter(Boolean).join(', ');
const money = (v) => Math.round(Number(v) * 100) / 100;

const toItem = (r) => ({
  transno: r.transno,
  salesdate: r.salesdate || null,
  custno: r.custno || null,
  customer: clean(r.custname),
  empno: r.empno || null,
  employee: personName(r),
  total: r.total == null ? null : money(r.total),
  lines: r.lines == null ? undefined : Number(r.lines),
  unpriced: r.unpriced == null ? undefined : Number(r.unpriced),
});
// Admins and superadmins also see the Status and the Stamp; everyone else gets neither.
const toAdminItem = (r) => ({ ...toItem(r), deleted: Boolean(r.is_deleted), status: r.is_deleted ? 'Inactive' : 'Active', stamp: r.stamp || null });

function createSales({ db, repo, perms, today = manilaToday }) {
  async function list(user, query) {
    const n = normalizeQuery(query);
    const admin = isAdminRole(user);
    const scope = admin ? n.status : 'active'; // only Admins may look at deleted sales
    const rows = await repo.listSales(db, {
      search: n.search, scope, sort: n.sort, dir: n.dir, limit: n.pageSize, offset: (n.page - 1) * n.pageSize,
    });
    const total = rows.length ? Number(rows[0].total_rows) : 0;
    const [canAdd, canEdit, canDelete, canDetails] = await Promise.all([
      perms.can(user, 'SALE_ADD'), perms.can(user, 'SALE_EDIT'), perms.can(user, 'SALE_DELETE'), perms.can(user, 'SALEDET_VIEW'),
    ]);
    const counts = admin ? await repo.countSales(db) : undefined;
    return {
      status: 200,
      body: {
        sales: rows.map(admin ? toAdminItem : toItem),
        status: scope,
        counts,
        total,
        page: n.page,
        pageSize: n.pageSize,
        pages: Math.max(1, Math.ceil(total / n.pageSize)),
        // Lets the screen show or hide buttons. The server still checks every action.
        can: { add: canAdd, edit: canEdit, delete: canDelete, details: canDetails, restore: admin, seeDeleted: admin },
      },
    };
  }

  // Drop-down choices for the New Sale / Edit Sale form.
  async function options() {
    const { customers, employees } = await repo.listOptions(db);
    return {
      status: 200,
      body: {
        customers: customers.map((c) => ({ code: c.code, name: clean(c.name) })),
        employees: employees.map((e) => ({ empno: e.empno, name: personName(e), hiredate: e.hiredate || null, sepdate: e.sepdate || null })),
      },
    };
  }

  const NOT_FOUND = { status: 404, body: { error: 'Sale not found.' } };

  // Shape check plus: customer and employee exist and are live, and the salesperson was employed on the sales date.
  // `previous` (the stored header, on Edit) lets an old sale keep its salesperson unless the person or the date is changed.
  async function check(client, body, previous = null) {
    const { errors, value } = validateSale(body, { today: today() });
    if (!errors.custno && !(await repo.findCustomer(client, value.custno))) errors.custno = 'That customer does not exist or is deleted. Choose another.';
    if (!errors.empno) {
      const emp = await repo.findEmployee(client, value.empno);
      if (!emp) errors.empno = 'That employee does not exist or is deleted. Choose another.';
      else if (!errors.salesdate && (!previous || previous.empno !== value.empno || previous.salesdate !== value.salesdate)) {
        if (emp.hiredate && value.salesdate < emp.hiredate) errors.empno = `This employee was hired on ${emp.hiredate}, after the sales date.`;
        else if (emp.sepdate && value.salesdate > emp.sepdate) errors.empno = `This employee left on ${emp.sepdate}, before the sales date.`;
      }
    }
    if (Object.keys(errors).length) return { fail: { status: 400, body: { errors } } };
    return { value };
  }

  async function create(actor, body) {
    return db.txAs(auditName(actor), async (client) => {
      const r = await check(client, body);
      if (r.fail) return r.fail;
      await repo.lockNumbering(client);
      const transno = await repo.nextTransNo(client);
      if (!transno) return { status: 409, body: { error: 'No more transaction numbers are available.' } };
      return { status: 201, body: { sale: toItem(await repo.insertSale(client, transno, r.value)) } };
    });
  }

  async function update(actor, transno, body) {
    if (!TRANS_RE.test(String(transno))) return NOT_FOUND;
    return db.txAs(auditName(actor), async (client) => {
      const current = await repo.findSale(client, transno);
      if (!current || current.is_deleted) return NOT_FOUND;
      const r = await check(client, body, current);
      if (r.fail) return r.fail;
      if (r.value.salesdate !== current.salesdate) {
        // Prices follow the sales date, so moving it re-prices every line. Refuse if a line would have no price; otherwise ask once.
        const c = await repo.countLinesUnpricedOn(client, transno, r.value.salesdate);
        if (c.unpriced) {
          const n = c.unpriced;
          return { status: 400, body: { errors: { salesdate: `${n} line${n === 1 ? ' has' : 's have'} no price on or before ${r.value.salesdate}. Add the price first, or choose a later date.` } } };
        }
        if (c.lines && body.confirmReprice !== true) {
          return {
            status: 409,
            body: { confirm: { lines: c.lines }, error: `Changing the sales date re-prices ${c.lines} line${c.lines === 1 ? '' : 's'} using the prices in force on ${r.value.salesdate}. The sale total may change.` },
          };
        }
      }
      const row = await repo.updateSale(client, transno, r.value);
      return row ? { status: 200, body: { sale: toItem(row) } } : NOT_FOUND;
    });
  }

  return { list, options, create, update };
}

module.exports = { createSales, normalizeQuery, VIEW_RIGHTS, LIST_RIGHTS, toItem, toAdminItem, clean, personName, money };
