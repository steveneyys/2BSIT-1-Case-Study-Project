'use strict';

const { validateEmployee, EMPNO_RE } = require('../validators/employee');
const { auditName } = require('./rights');
const { isAdminRole } = require('./permissions');
const { pickCurrent } = require('./jobHistory');
const { manilaToday } = require('../validators/employee');

const SORT_KEYS = ['empno', 'name', 'gender', 'hired', 'separated'];
const STATUSES = ['active', 'deleted', 'all'];
const GENDERS = ['M', 'F'];
const EMPLOYMENT = ['employed', 'separated'];
const PAGE_SIZES = [10, 25, 50, 100];
// Holding any employee right opens the screen; so does View Job History (a person who may see job history must be able
// to reach an employee to look at). Changing anything still needs the matching Add/Edit/Delete right, checked per route.
const VIEW_RIGHTS = ['EMP_ADD', 'EMP_EDIT', 'EMP_DELETE', 'JOBHIST_VIEW'];

// Turns whatever the browser sent into safe, bounded values. Unknown values fall back to defaults.
function normalizeQuery(q = {}) {
  const search = String(q.search ?? '').trim().slice(0, 100);
  const gender = GENDERS.includes(String(q.gender ?? '').toUpperCase()) ? String(q.gender).toUpperCase() : null;
  const employment = EMPLOYMENT.includes(q.employment) ? q.employment : null;
  const status = STATUSES.includes(q.status) ? q.status : 'active';
  const sort = SORT_KEYS.includes(q.sort) ? q.sort : 'empno';
  const dir = q.dir === 'desc' ? 'desc' : 'asc';
  const pageSize = PAGE_SIZES.includes(Number(q.pageSize)) ? Number(q.pageSize) : 25;
  const page = Math.min(Math.max(Number.parseInt(q.page, 10) || 1, 1), 100000);
  return { search, gender, employment, status, sort, dir, pageSize, page };
}

const clean = (v) => String(v ?? '').trim();
const jobItem = (r) => ({
  jobcode: r.jobcode, job: clean(r.jobdesc) || r.jobcode, deptcode: r.deptcode, department: clean(r.deptname) || r.deptcode,
  effdate: r.effdate, salary: r.salary == null ? null : Number(r.salary),
});
const toItem = (r) => ({
  empno: r.empno,
  lastname: clean(r.lastname),
  firstname: clean(r.firstname),
  gender: r.gender || null,
  birthdate: r.birthdate || null,
  hiredate: r.hiredate || null,
  sepdate: r.sepdate || null,
});
// Admins and superadmins also see the Status and the Stamp; everyone else gets neither.
const toAdminItem = (r) => ({ ...toItem(r), deleted: Boolean(r.is_deleted), status: r.is_deleted ? 'Inactive' : 'Active', stamp: r.stamp || null });

function createEmployees({ db, repo, perms, historyRepo = null, today = manilaToday }) {
  async function list(user, query) {
    const n = normalizeQuery(query);
    const admin = isAdminRole(user);
    const scope = admin ? n.status : 'active'; // only Admins may look at deleted employees
    const rows = await repo.listEmployees(db, {
      search: n.search, gender: n.gender, employment: n.employment, scope, sort: n.sort, dir: n.dir,
      limit: n.pageSize, offset: (n.page - 1) * n.pageSize,
    });
    const total = rows.length ? Number(rows[0].total) : 0;
    const [canAdd, canEdit, canDelete, canHistory] = await Promise.all([
      perms.can(user, 'EMP_ADD'), perms.can(user, 'EMP_EDIT'), perms.can(user, 'EMP_DELETE'), perms.can(user, 'JOBHIST_VIEW'),
    ]);
    const counts = admin ? await repo.countEmployees(db) : undefined;
    return {
      status: 200,
      body: {
        employees: rows.map(admin ? toAdminItem : toItem),
        status: scope,
        counts,
        total,
        page: n.page,
        pageSize: n.pageSize,
        pages: Math.max(1, Math.ceil(total / n.pageSize)),
        // Lets the screen show or hide buttons. The server still checks every action. history = View Job History right (S3-DEV-08).
        can: { add: canAdd, edit: canEdit, delete: canDelete, restore: admin, seeDeleted: admin, history: canHistory },
      },
    };
  }

  const NOT_FOUND = { status: 404, body: { error: 'Employee not found.' } };
  const takenResponse = (row) => ({
    status: 409,
    body: {
      errors: {
        empno: row.is_deleted
          ? 'That employee number belongs to a deleted employee. An Admin can restore it, or use another number.'
          : 'That employee number already exists.',
      },
    },
  });

  // The route has already checked EMP_ADD / EMP_EDIT. The audit log and the Stamp column name the real person.
  async function create(actor, body) {
    const { errors, value } = validateEmployee(body, { needEmpno: true });
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    try {
      return await db.txAs(auditName(actor), async (client) => {
        const taken = await repo.findAnyEmployee(client, value.empno);
        if (taken) return takenResponse(taken);
        return { status: 201, body: { employee: toItem(await repo.insertEmployee(client, value)) } };
      });
    } catch (err) {
      if (err.code === '23505') return takenResponse({ is_deleted: false }); // same number added at the same moment
      throw err;
    }
  }

  async function update(actor, empno, body) {
    if (!EMPNO_RE.test(String(empno))) return NOT_FOUND;
    const { errors, value } = validateEmployee(body); // any "empno" in the body is ignored
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    try {
      return await db.txAs(auditName(actor), async (client) => {
        const row = await repo.updateEmployee(client, empno, value);
        return row ? { status: 200, body: { employee: toItem(row) } } : NOT_FOUND;
      });
    } catch (err) {
      // Migration 013: the hire date cannot move past existing job history. Say so beside the field.
      if (/Hire date .* is after existing job history/i.test(String(err.message))) {
        return { status: 400, body: { errors: { hiredate: 'Hire date cannot be later than this employee\'s existing job history. Change or delete the earlier job history first.' } } };
      }
      throw err;
    }
  }

  const fullName = (r) => `${clean(r.firstname)} ${clean(r.lastname)}`.trim() || r.empno;
  const blocked = (name, c) => {
    const parts = [];
    if (c && c.history) parts.push(`${c.history} job history record${c.history === 1 ? '' : 's'}`);
    if (c && c.sales) parts.push(`${c.sales} sales record${c.sales === 1 ? '' : 's'}`);
    return { status: 409, body: { error: `${name} still has ${parts.length ? parts.join(' and ') : 'active job history or sales records'}, so the employee cannot be deleted.` } };
  };

  async function remove(actor, empno) {
    if (!EMPNO_RE.test(String(empno))) return NOT_FOUND;
    try {
      return await db.txAs(auditName(actor), async (client) => {
        const row = await repo.findEmployee(client, empno);
        if (!row) return NOT_FOUND;
        // Friendly check first; the database trigger is the final guard if a record appears in between.
        const c = await repo.countActiveChildren(client, empno);
        if (c.history + c.sales > 0) return blocked(fullName(row), c);
        const done = await repo.softDeleteEmployee(client, empno);
        return done ? { status: 200, body: { employee: toItem(done) } } : NOT_FOUND;
      });
    } catch (err) {
      // Migration 014: an active user account is linked to this employee.
      if (/active user account is linked/i.test(String(err.message))) {
        return { status: 409, body: { error: 'This employee has a linked user account, so the employee cannot be deleted. Unlink or delete the account first.' } };
      }
      if (/Cannot delete employee/i.test(String(err.message))) return blocked('This employee');
      throw err;
    }
  }

  async function restore(actor, empno) {
    if (!isAdminRole(actor)) return { status: 403, body: { error: 'Only an Admin can restore an employee.' } };
    if (!EMPNO_RE.test(String(empno))) return NOT_FOUND;
    return db.txAs(auditName(actor), async (client) => {
      const gone = await repo.findAnyEmployee(client, empno);
      if (!gone || !gone.is_deleted) return NOT_FOUND;
      const row = await repo.restoreEmployee(client, empno);
      return row ? { status: 200, body: { employee: toItem(row) } } : NOT_FOUND;
    });
  }

  // Profile: personal details for anyone who may open the employees screens. The job timeline and salaries are
  // included ONLY when the person holds the View Job History right (Admins and Superadmins always do): they are not
  // merely hidden on screen, they are never sent.
  async function profile(user, empno) {
    if (!EMPNO_RE.test(String(empno))) return NOT_FOUND;
    const admin = isAdminRole(user);
    const row = await repo.findProfile(db, empno);
    if (!row || (row.is_deleted && !admin)) return NOT_FOUND;
    const [canHistory, canEdit] = await Promise.all([perms.can(user, 'JOBHIST_VIEW'), perms.can(user, 'EMP_EDIT')]);
    let history = null;
    if (canHistory && historyRepo) {
      const rows = await historyRepo.listHistory(db, empno); // live rows only
      const now = today();
      const current = pickCurrent(rows, now);
      history = {
        current: current ? jobItem(current) : null,
        timeline: rows.map((r) => ({ ...jobItem(r), current: r === current, upcoming: r.effdate > now })),
      };
    }
    const base = toItem(row);
    return {
      status: 200,
      body: {
        employee: {
          ...base,
          employment: base.sepdate ? 'Separated' : 'Employed', // leaving the company, not the same as a deleted record
          ...(admin ? { deleted: Boolean(row.is_deleted), status: row.is_deleted ? 'Inactive' : 'Active', stamp: row.stamp || null } : {}),
        },
        history, // null = no right to see it
        can: { history: canHistory, edit: canEdit && !row.is_deleted },
      },
    };
  }

  return { list, profile, create, update, remove, restore };
}

module.exports = { createEmployees, normalizeQuery, VIEW_RIGHTS };
