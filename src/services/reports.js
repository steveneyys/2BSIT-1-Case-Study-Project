'use strict';

const { manilaToday, EMPNO_RE } = require('../validators/employee');
const { parseRange } = require('../validators/report');

// One entry per report. `right` is the report right that opens it. Adding a report = adding an entry here and its route line
// comes with it (routes/reports.js loops over this list).
// Part 1 (S4-DEV-04): the four list reports. Part 2 (S4-DEV-05): Top Customers, Top Products and Top Sales.
const clean = (v) => String(v ?? '').trim();
const personName = (r) => [clean(r.lastname), clean(r.firstname)].filter(Boolean).join(', ');
const GENDERS = { M: 'Male', F: 'Female' };
const employeeRow = (r) => ({
  empno: r.empno, name: personName(r), gender: GENDERS[r.gender] || '—', hiredate: r.hiredate || null, sepdate: r.sepdate || null,
});
const EMPLOYEE_COLUMNS = [
  { key: 'empno', label: 'Employee No.' }, { key: 'name', label: 'Name' }, { key: 'gender', label: 'Gender' },
  { key: 'hiredate', label: 'Hire date', type: 'date' }, { key: 'sepdate', label: 'Separation date', type: 'date' },
];

const money = (v) => Math.round(Number(v) * 100) / 100;
const startOfYear = (d) => `${d.slice(0, 4)}-01-01`;

// The three ranked sales reports share one shape: From, To and Top N in; Rank + columns out; a total of the rows listed.
// Nothing runs until the filters are sent ("Generate Report"); before that the screen gets the default filters only.
function rankedReport({ db, repo, today }, { right, title, summary, columns, fetch, toRow }) {
  return {
    right, title, summary,
    async run(_user, query) {
      const asOf = today();
      const defaults = { from: startOfYear(asOf), to: asOf, topn: 10 };
      const base = { asOf, filters: { kind: 'range', ...defaults }, columns: [{ key: 'rank', label: 'Rank', type: 'number' }, ...columns] };
      if (query.from === undefined && query.to === undefined && query.topn === undefined) {
        return { ...base, rows: [], prompt: 'Choose the dates and how many rows to show, then generate the report.' };
      }
      const { errors, value } = parseRange(query);
      if (Object.keys(errors).length) return { fail: { status: 400, body: { errors } } };
      const [rows, unpriced] = await Promise.all([repo[fetch](db, value), repo.unpricedLines(db, value)]);
      const out = rows.map((r, i) => ({ rank: i + 1, ...toRow(r) }));
      const total = out.reduce((sum, r) => sum + Math.round(r.amount * 100), 0) / 100;
      return {
        ...base,
        filters: { kind: 'range', ...value },
        subject: `Period ${value.from} to ${value.to} · Top ${value.topn}`,
        rows: out,
        total,
        totalLabel: 'Total of the rows listed',
        note: unpriced ? `${unpriced} sale line${unpriced === 1 ? ' has' : 's have'} no price on the sale date and ${unpriced === 1 ? 'is' : 'are'} left out.` : undefined,
        prompt: out.length ? undefined : 'No sales in this date range. Choose another date range and generate the report again.',
      };
    },
  };
}

function createReports({ db, repo, perms, today = manilaToday }) {
  const DEFS = {
    'product-master': {
      right: 'RPT_PRODUCT_MASTER', title: 'Product Master List', summary: 'All active products with their current price.',
      async run() {
        const asOf = today();
        const rows = await repo.productMaster(db, asOf);
        return {
          asOf,
          columns: [{ key: 'prodcode', label: 'Product code' }, { key: 'description', label: 'Description' }, { key: 'unit', label: 'Unit' }, { key: 'unitprice', label: 'Current price', type: 'money' }],
          rows: rows.map((r) => ({ prodcode: r.prodcode, description: clean(r.description), unit: clean(r.unit) || null, unitprice: r.unitprice == null ? null : Number(r.unitprice) })),
        };
      },
    },
    'active-employees': {
      right: 'RPT_ACTIVE_EMPLOYEES', title: 'Active Employees', summary: 'Employees with no separation date, or one that has not happened yet.',
      async run() {
        const asOf = today();
        return { asOf, columns: EMPLOYEE_COLUMNS, rows: (await repo.activeEmployees(db, asOf)).map(employeeRow) };
      },
    },
    'all-employees': {
      right: 'RPT_ALL_EMPLOYEES', title: 'All Employees', summary: 'Every active employee record, including those who have separated.',
      async run() {
        return { asOf: today(), columns: EMPLOYEE_COLUMNS, rows: (await repo.allEmployees(db)).map(employeeRow) };
      },
    },
    'employee-job-history': {
      right: 'RPT_EMP_JOB_HISTORY', title: 'Employee Job History', summary: 'The job, department and salary history of one employee.',
      // Salary is in this report, so it also follows the View Job History rule from the HR screens.
      extraRight: 'JOBHIST_VIEW',
      async run(_user, query) {
        const employees = (await repo.employeeChoices(db)).map((e) => ({ empno: e.empno, name: personName(e) }));
        const columns = [
          { key: 'empno', label: 'Employee No.' }, { key: 'effdate', label: 'Effective date', type: 'date' }, { key: 'job', label: 'Job' },
          { key: 'department', label: 'Department' }, { key: 'salary', label: 'Salary', type: 'money' },
        ];
        const empno = clean(query.empno);
        const base = { asOf: today(), filters: { employees, empno: empno || null }, columns };
        if (!empno) return { ...base, rows: [], prompt: 'Choose an employee to see the history.' };
        if (!EMPNO_RE.test(empno)) return { fail: { status: 400, body: { error: 'Choose an existing employee.' } } };
        const emp = await repo.findEmployee(db, empno);
        if (!emp) return { fail: { status: 404, body: { error: 'Employee not found.' } } };
        const rows = await repo.jobHistory(db, empno);
        return {
          ...base,
          subject: `${emp.empno} · ${personName(emp)}`,
          rows: rows.map((r) => ({
            empno: r.empno, effdate: r.effdate, job: clean(r.jobdesc) || r.jobcode, department: clean(r.deptname) || r.deptcode || '—',
            salary: r.salary == null ? null : Number(r.salary),
          })),
        };
      },
    },
  };

  DEFS['top-customers'] = rankedReport({ db, repo, today }, {
    right: 'RPT_TOP_CUSTOMERS', title: 'Top Customers', summary: 'Customers ranked by the value of their sales in a date range.',
    columns: [{ key: 'custno', label: 'Customer No.' }, { key: 'customer', label: 'Customer name' }, { key: 'amount', label: 'Sales total', type: 'money' }],
    fetch: 'topCustomers', toRow: (r) => ({ custno: r.custno, customer: clean(r.custname) || '—', amount: money(r.amount) }),
  });
  DEFS['top-products'] = rankedReport({ db, repo, today }, {
    right: 'RPT_TOP_PRODUCTS', title: 'Top Products', summary: 'Products ranked by sales amount in a date range.',
    columns: [{ key: 'prodcode', label: 'Product code' }, { key: 'description', label: 'Description' }, { key: 'quantity', label: 'Quantity sold', type: 'number' }, { key: 'amount', label: 'Sales amount', type: 'money' }],
    fetch: 'topProducts', toRow: (r) => ({ prodcode: r.prodcode, description: clean(r.description) || '—', quantity: Number(r.quantity), amount: money(r.amount) }),
  });
  DEFS['top-sales'] = rankedReport({ db, repo, today }, {
    right: 'RPT_TOP_SALES', title: 'Top Sales', summary: 'The largest sales transactions in a date range.',
    columns: [{ key: 'transno', label: 'Transaction No.' }, { key: 'salesdate', label: 'Sales date', type: 'date' }, { key: 'customer', label: 'Customer' }, { key: 'amount', label: 'Sales amount', type: 'money' }],
    fetch: 'topSales', toRow: (r) => ({ transno: r.transno, salesdate: r.salesdate, customer: clean(r.custname) || r.custno || '—', amount: money(r.amount) }),
  });

  const RIGHTS = Object.values(DEFS).map((d) => d.right);

  // The reports this person may open: shown on the Reports page. Rights are read on every call.
  async function index(user) {
    const list = [];
    for (const [slug, d] of Object.entries(DEFS)) {
      if (await perms.can(user, d.right)) list.push({ slug, title: d.title, summary: d.summary });
    }
    return { status: 200, body: { reports: list } };
  }

  // Runs one report. The route already checked the report right; it is checked again here so a report can never be served
  // without it, whichever way this function is called.
  async function run(user, slug, query = {}) {
    const d = Object.prototype.hasOwnProperty.call(DEFS, slug) ? DEFS[slug] : null;
    if (!d) return { status: 404, body: { error: 'Report not found.' } };
    if (!(await perms.can(user, d.right))) return { status: 403, body: { error: 'You do not have permission to open this report.' } };
    if (d.extraRight && !(await perms.can(user, d.extraRight))) {
      return { status: 403, body: { error: 'Job history access is required. You cannot open this report with your current permissions.' } };
    }
    const out = await d.run(user, query);
    if (out.fail) return out.fail;
    const { rows, ...rest } = out;
    return { status: 200, body: { report: { slug, title: d.title }, ...rest, rows, count: rows.length } };
  }

  return { index, run, defs: DEFS, RIGHTS };
}

// The rights of all seven reports; the reports screens open for anyone holding one of them.
const REPORT_RIGHTS = ['RPT_PRODUCT_MASTER', 'RPT_ACTIVE_EMPLOYEES', 'RPT_ALL_EMPLOYEES', 'RPT_EMP_JOB_HISTORY', 'RPT_TOP_CUSTOMERS', 'RPT_TOP_PRODUCTS', 'RPT_TOP_SALES'];
const REPORT_SLUGS = ['product-master', 'active-employees', 'all-employees', 'employee-job-history', 'top-customers', 'top-products', 'top-sales'];

module.exports = { createReports, REPORT_RIGHTS, REPORT_SLUGS };
