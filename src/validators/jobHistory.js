'use strict';

const { parseDate, manilaToday } = require('./employee');

const JOB_RE = /^[A-Z0-9]{2,4}$/; // jobCode VARCHAR(4)
const DEPT_RE = /^[A-Z0-9]{2,3}$/; // deptCode (department codes are 2-3 characters)
const MAX_SALARY = 99999999.99; // salary DECIMAL(10,2)

// Salary arrives as text from the form. Returns { value: '12345.50' } or { error }.
function parseSalary(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { error: 'Enter the salary.' };
  if (!/^-?\d+(\.\d+)?$/.test(text)) return { error: 'Enter the salary as a number, for example 25000.50.' };
  if (text.startsWith('-')) return { error: 'Salary cannot be negative.' };
  if ((text.split('.')[1] || '').length > 2) return { error: 'Use at most 2 decimal places.' };
  if (Number(text) > MAX_SALARY) return { error: 'Salary is too large. The maximum is 99,999,999.99.' };
  return { value: Number(text).toFixed(2) };
}

// Checks the shape of one job history row. Whether the job, department and employee exist is checked by the service.
// `hiredate` (YYYY-MM-DD or null) is the employee's hire date: a row cannot start before it.
function validateJobHistory(body = {}, { hiredate = null } = {}) {
  const errors = {};
  const jobcode = String(body.jobcode ?? '').trim().toUpperCase();
  const deptcode = String(body.deptcode ?? '').trim().toUpperCase();
  const eff = parseDate(body.effdate);
  const salary = parseSalary(body.salary);

  if (!jobcode) errors.jobcode = 'Choose the job.';
  else if (!JOB_RE.test(jobcode)) errors.jobcode = 'Choose an existing job.';
  if (!deptcode) errors.deptcode = 'Choose the department.';
  else if (!DEPT_RE.test(deptcode)) errors.deptcode = 'Choose an existing department.';

  if (eff === '') errors.effdate = 'Enter the effective date.';
  else if (eff === null) errors.effdate = 'Enter a real date as YYYY-MM-DD.';
  else if (hiredate && eff < hiredate) errors.effdate = `Effective date cannot be before the hire date (${hiredate}).`;

  if (salary.error) errors.salary = salary.error;

  return { errors, value: { jobcode, deptcode, effdate: eff || null, salary: salary.value ?? null } };
}

module.exports = { validateJobHistory, parseSalary, JOB_RE, DEPT_RE, manilaToday };
