'use strict';

const { validateJobHistory, JOB_RE } = require('../validators/jobHistory');
const { manilaToday, parseDate, EMPNO_RE } = require('../validators/employee');
const { auditName } = require('./rights');
const { isAdminRole } = require('./permissions');

const VIEW_RIGHTS = ['JOBHIST_VIEW', 'JOBHIST_ADD', 'JOBHIST_EDIT', 'JOBHIST_DELETE']; // any of these opens the router
const clean = (v) => String(v ?? '').trim();

const toItem = (r) => ({
  jobcode: r.jobcode, job: clean(r.jobdesc) || r.jobcode, deptcode: r.deptcode, department: clean(r.deptname) || r.deptcode,
  effdate: r.effdate, salary: r.salary == null ? null : Number(r.salary),
});
const toAdminItem = (r) => ({ ...toItem(r), deleted: Boolean(r.is_deleted), status: r.is_deleted ? 'Inactive' : 'Active', stamp: r.stamp || null });

// The current job is the live row with the latest effective date that has already started (a future date is not current yet).
function pickCurrent(rows, today) {
  let best = null;
  for (const r of rows) {
    if (r.is_deleted || r.effdate > today) continue;
    if (!best || r.effdate > best.effdate) best = r;
  }
  return best;
}

const NOT_FOUND = { status: 404, body: { error: 'Job history record not found.' } };
const NO_EMPLOYEE = { status: 404, body: { error: 'Employee not found.' } };
const DATE_TAKEN = { status: 409, body: { errors: { effdate: 'This employee already has a job history record with that effective date.' } } };
const DELETED_SAME = { status: 409, body: { errors: { effdate: 'A deleted record has the same job and date. An Admin can restore it, or choose another date.' } } };
const badKey = (jobcode, effdate) => !JOB_RE.test(String(jobcode)) || !parseDate(effdate);

function createJobHistory({ db, repo, perms, today = manilaToday }) {
  async function view(user, empno) {
    if (!EMPNO_RE.test(String(empno))) return NO_EMPLOYEE;
    const admin = isAdminRole(user);
    const emp = await repo.findEmployee(db, empno);
    if (!emp || (emp.is_deleted && !admin)) return NO_EMPLOYEE; // only Admins can look at deleted employees
    const rows = await repo.listHistory(db, empno, { includeDeleted: admin });
    const current = pickCurrent(rows, today());
    const [canAdd, canEdit, canDelete] = await Promise.all([
      perms.can(user, 'JOBHIST_ADD'), perms.can(user, 'JOBHIST_EDIT'), perms.can(user, 'JOBHIST_DELETE'),
    ]);
    const live = !emp.is_deleted;
    return {
      status: 200,
      body: {
        employee: { empno: emp.empno, lastname: clean(emp.lastname), firstname: clean(emp.firstname), hiredate: emp.hiredate, sepdate: emp.sepdate, deleted: Boolean(emp.is_deleted) },
        history: rows.map((r) => ({ ...(admin ? toAdminItem(r) : toItem(r)), current: current === r })),
        current: current ? toItem(current) : null,
        options: live && (canAdd || canEdit) ? await repo.listOptions(db) : undefined,
        // Lets the screen show or hide buttons. The server still checks every action.
        can: { add: canAdd && live, edit: canEdit && live, delete: canDelete, restore: admin, seeDeleted: admin },
      },
    };
  }

  // Shape check plus: employee is live, job and department exist and are live, one live row per effective date.
  async function check(client, empno, body, except = null) {
    const emp = await repo.findEmployee(client, empno);
    if (!emp) return { fail: NO_EMPLOYEE };
    if (emp.is_deleted) return { fail: { status: 409, body: { error: 'This employee is deleted. Restore the employee first.' } } };
    const { errors, value } = validateJobHistory(body, { hiredate: emp.hiredate });
    if (!errors.jobcode && !(await repo.findJob(client, value.jobcode))) errors.jobcode = 'That job does not exist or is deleted. Choose another.';
    if (!errors.deptcode && !(await repo.findDepartment(client, value.deptcode))) errors.deptcode = 'That department does not exist or is deleted. Choose another.';
    if (Object.keys(errors).length) return { fail: { status: 400, body: { errors } } };
    if (await repo.findLiveEffdate(client, empno, value.effdate, except)) return { fail: DATE_TAKEN };
    return { value };
  }

  async function create(actor, empno, body) {
    if (!EMPNO_RE.test(String(empno))) return NO_EMPLOYEE;
    try {
      return await db.txAs(auditName(actor), async (client) => {
        await repo.lockEmployee(client, empno);
        const r = await check(client, empno, body);
        if (r.fail) return r.fail;
        if (await repo.findRow(client, empno, r.value.jobcode, r.value.effdate)) return DELETED_SAME;
        return { status: 201, body: { record: toItem(await repo.insertRow(client, empno, r.value)) } };
      });
    } catch (err) {
      if (err.code === '23505') return DATE_TAKEN; // same row added at the same moment
      throw err;
    }
  }

  async function update(actor, empno, jobcode, effdate, body) {
    if (!EMPNO_RE.test(String(empno)) || badKey(jobcode, effdate)) return NOT_FOUND;
    const key = { jobcode, effdate };
    try {
      return await db.txAs(auditName(actor), async (client) => {
        await repo.lockEmployee(client, empno);
        const current = await repo.findRow(client, empno, jobcode, effdate);
        if (!current || current.is_deleted) return NOT_FOUND;
        const r = await check(client, empno, body, key);
        if (r.fail) return r.fail;
        const moved = r.value.jobcode !== jobcode || r.value.effdate !== effdate;
        if (moved && (await repo.findRow(client, empno, r.value.jobcode, r.value.effdate))) return DELETED_SAME;
        const row = await repo.updateRow(client, empno, key, r.value);
        return row ? { status: 200, body: { record: toItem(row) } } : NOT_FOUND;
      });
    } catch (err) {
      if (err.code === '23505') return DATE_TAKEN;
      throw err;
    }
  }

  async function remove(actor, empno, jobcode, effdate) {
    if (!EMPNO_RE.test(String(empno)) || badKey(jobcode, effdate)) return NOT_FOUND;
    return db.txAs(auditName(actor), async (client) => {
      const row = await repo.softDeleteRow(client, empno, { jobcode, effdate });
      return row ? { status: 200, body: { record: toItem(row) } } : NOT_FOUND;
    });
  }

  async function restore(actor, empno, jobcode, effdate) {
    if (!isAdminRole(actor)) return { status: 403, body: { error: 'Only an Admin can restore a job history record.' } };
    if (!EMPNO_RE.test(String(empno)) || badKey(jobcode, effdate)) return NOT_FOUND;
    try {
      return await db.txAs(auditName(actor), async (client) => {
        await repo.lockEmployee(client, empno);
        const gone = await repo.findRow(client, empno, jobcode, effdate);
        if (!gone || !gone.is_deleted) return NOT_FOUND;
        // Restoring must not leave two live rows with the same effective date.
        if (await repo.findLiveEffdate(client, empno, effdate)) {
          return { status: 409, body: { error: 'This employee already has another live record with that effective date. Delete or change that one first.' } };
        }
        const row = await repo.restoreRow(client, empno, { jobcode, effdate });
        return row ? { status: 200, body: { record: toItem(row) } } : NOT_FOUND;
      });
    } catch (err) {
      if (/Restore it first/i.test(String(err.message))) {
        return { status: 409, body: { error: 'The employee, job or department of this record is deleted. Restore that first.' } };
      }
      throw err;
    }
  }

  // Someone with Add, Edit or Delete but without View Job History must not learn salaries from a reply: a Delete or Edit
  // answer would otherwise echo the stored row. They get the row's key back, nothing else.
  async function scrub(actor, result) {
    const record = result.body && result.body.record;
    if (!record || (await perms.can(actor, 'JOBHIST_VIEW'))) return result;
    return { ...result, body: { record: { jobcode: record.jobcode, effdate: record.effdate } } };
  }
  const guarded = (fn) => async (actor, ...args) => scrub(actor, await fn(actor, ...args));

  return { view, create: guarded(create), update: guarded(update), remove: guarded(remove), restore: guarded(restore) };
}

module.exports = { createJobHistory, pickCurrent, VIEW_RIGHTS };
