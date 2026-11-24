'use strict';

const { isAdminRole } = require('./permissions');

const SORT_KEYS = ['empno', 'name', 'gender', 'hired', 'separated'];
const STATUSES = ['active', 'deleted', 'all'];
const GENDERS = ['M', 'F'];
const EMPLOYMENT = ['employed', 'separated'];
const PAGE_SIZES = [10, 25, 50, 100];
const VIEW_RIGHTS = ['EMP_ADD', 'EMP_EDIT', 'EMP_DELETE']; // holding any employee right opens the screen

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

function createEmployees({ db, repo, perms }) {
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

  return { list };
}

module.exports = { createEmployees, normalizeQuery, VIEW_RIGHTS };
