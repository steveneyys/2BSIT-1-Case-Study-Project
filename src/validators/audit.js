'use strict';

const { parseDate } = require('./employee');

// Modules the audit trail knows about: audit_log.table_name -> what the screen calls it.
const MODULES = {
  customer: 'Customers',
  product: 'Products',
  pricehist: 'Price History',
  department: 'Departments',
  job: 'Jobs',
  employee: 'Employees',
  jobhistory: 'Job History',
  sales: 'Sales',
  salesdetail: 'Sale Details',
  payment: 'Payments',
  app_user: 'User Accounts',
  user_permission: 'User Rights',
};
const ACTIONS = { ADD: 'Add', EDIT: 'Edit', DELETE: 'Delete', RESTORE: 'Restore' };
const PAGE_SIZES = [10, 25, 50, 100];
const MAX_REF = 60; // audit_log.record_key is VARCHAR(60)
const MAX_ACTOR = 100; // audit_log.action_by is VARCHAR(100)

// Filters of the audit viewer. Every filter is optional. Returns { errors, value }.
function parseAuditQuery(query = {}) {
  const errors = {};
  const from = parseDate(query.from);
  const to = parseDate(query.to);
  const actor = String(query.actor ?? '').trim();
  const module = String(query.module ?? '').trim();
  const action = String(query.action ?? '').trim().toUpperCase();
  const ref = String(query.ref ?? '').trim();

  if (from === null) errors.from = 'Enter a real date as YYYY-MM-DD.';
  if (to === null) errors.to = 'Enter a real date as YYYY-MM-DD.';
  if (from && to && from > to) errors.from = 'The From date must be on or before the To date.';
  if (actor.length > MAX_ACTOR) errors.actor = 'Choose an actor from the list.';
  if (module && !Object.hasOwn(MODULES, module)) errors.module = 'Choose a module from the list.';
  if (action && !Object.hasOwn(ACTIONS, action)) errors.action = 'Choose an action from the list.';
  if (ref.length > MAX_REF) errors.ref = `The record reference can be at most ${MAX_REF} characters.`;

  const page = Number.parseInt(query.page, 10);
  const size = Number.parseInt(query.pageSize, 10);
  return {
    errors,
    value: {
      from: from || null, to: to || null, actor: actor || null, module: module || null, action: action || null, ref: ref || null,
      page: Number.isInteger(page) && page > 0 ? page : 1,
      pageSize: PAGE_SIZES.includes(size) ? size : 25,
    },
  };
}

module.exports = { parseAuditQuery, MODULES, ACTIONS, PAGE_SIZES };
