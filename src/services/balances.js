'use strict';

const { isAdminRole } = require('./permissions');
const { TRANS_RE } = require('../validators/sale');
const { CUST_RE } = require('../validators/sale');
const { clean } = require('./sales');

const cents = (v) => Math.round(Number(v) * 100);
const money = (c) => c / 100;

// How to read a balance: more than 0 is still owed, 0 is settled, below 0 means more was paid than the sale total.
function standing(balanceCents) {
  if (balanceCents > 0) return 'Balance due';
  if (balanceCents === 0) return 'Paid in full';
  return 'Overpaid';
}

const figures = (r) => {
  const balance = cents(r.total) - cents(r.paid);
  const unpriced = Number(r.unpriced);
  return { total: money(cents(r.total)), paid: money(cents(r.paid)), balance: money(balance), standing: standing(balance), unpriced, complete: unpriced === 0 };
};

const NOT_FOUND_SALE = { status: 404, body: { error: 'Sale not found.' } };
const NOT_FOUND_CUSTOMER = { status: 404, body: { error: 'Customer not found.' } };

function createBalances({ db, repo }) {
  // Transaction balance: sale total, paid, balance and the payments behind it. Only active payments are counted or listed;
  // an Admin is also told how many inactive ones exist (they are not part of the balance).
  async function transaction(user, transno) {
    if (!TRANS_RE.test(String(transno))) return NOT_FOUND_SALE;
    const admin = isAdminRole(user);
    const sale = await repo.findSaleFigures(db, transno);
    if (!sale || (sale.is_deleted && !admin)) return NOT_FOUND_SALE; // only Admins can look at a deleted sale
    const all = await repo.listSalePayments(db, transno, { includeDeleted: admin });
    const live = all.filter((p) => !p.is_deleted);
    return {
      status: 200,
      body: {
        sale: { transno: sale.transno, salesdate: sale.salesdate, custno: sale.custno, customer: clean(sale.custname), deleted: Boolean(sale.is_deleted) },
        ...figures(sale),
        payments: live.map((p) => ({ orno: p.orno, paydate: p.paydate, amount: money(cents(p.amount)) })),
        inactivePayments: admin ? all.length - live.length : undefined,
      },
    };
  }

  // Customer balance: the figures of each live sale of the customer, and the customer's balance (the sum of those balances).
  async function customer(user, custno) {
    const key = String(custno).toUpperCase();
    if (!CUST_RE.test(key)) return NOT_FOUND_CUSTOMER;
    const cust = await repo.findCustomer(db, key);
    if (!cust || (cust.is_deleted && !isAdminRole(user))) return NOT_FOUND_CUSTOMER;
    const sales = await repo.listCustomerSales(db, key);
    const rows = sales.map((s) => ({ transno: s.transno, salesdate: s.salesdate, ...figures(s) }));
    const sum = (k) => money(rows.reduce((n, r) => n + cents(r[k]), 0));
    const unpriced = rows.reduce((n, r) => n + r.unpriced, 0);
    return {
      status: 200,
      body: {
        customer: { custno: cust.custno, name: clean(cust.custname), deleted: Boolean(cust.is_deleted) },
        sales: rows,
        total: sum('total'),
        paid: sum('paid'),
        balance: sum('balance'),
        standing: standing(cents(sum('balance'))),
        unpriced,
        complete: unpriced === 0,
      },
    };
  }

  return { transaction, customer };
}

module.exports = { createBalances, standing };
