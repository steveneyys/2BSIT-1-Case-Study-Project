'use strict';

const { manilaToday, EMPNO_RE } = require('../validators/employee');

// One entry per report. `right` is the report right that opens it. Adding a report = adding an entry here and its route line
// comes with it (routes/reports.js loops over this list).
// Part 1 (S4-DEV-04): the four list reports. Part 2 (S4-DEV-05) adds Top Customers, Top Products and Top Sales.
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

// The rights of the reports built so far; the reports screens open for anyone holding one of them.
const REPORT_RIGHTS = ['RPT_PRODUCT_MASTER', 'RPT_ACTIVE_EMPLOYEES', 'RPT_ALL_EMPLOYEES', 'RPT_EMP_JOB_HISTORY'];
const REPORT_SLUGS = ['product-master', 'active-employees', 'all-employees', 'employee-job-history'];

module.exports = { createReports, REPORT_RIGHTS, REPORT_SLUGS };
