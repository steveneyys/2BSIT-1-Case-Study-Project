'use strict';

const { validateDepartment, CODE_RE } = require('../validators/department');
const { auditName } = require('./rights');
const { isAdminRole } = require('./permissions');

const SORT_KEYS = ['code', 'name'];
const STATUSES = ['active', 'deleted', 'all'];
const PAGE_SIZES = [10, 25, 50, 100];
const VIEW_RIGHTS = ['DEPT_ADD', 'DEPT_EDIT', 'DEPT_DELETE']; // holding any department right opens the screen

function normalizeQuery(q = {}) {
  const search = String(q.search ?? '').trim().slice(0, 100);
  const status = STATUSES.includes(q.status) ? q.status : 'active';
  const sort = SORT_KEYS.includes(q.sort) ? q.sort : 'code';
  const dir = q.dir === 'desc' ? 'desc' : 'asc';
  const pageSize = PAGE_SIZES.includes(Number(q.pageSize)) ? Number(q.pageSize) : 25;
  const page = Math.min(Math.max(Number.parseInt(q.page, 10) || 1, 1), 100000);
  return { search, status, sort, dir, pageSize, page };
}

const toItem = (r) => ({ code: r.deptcode, name: String(r.deptname ?? '').trim() });
// Admins and superadmins also see the Status and the Stamp; everyone else gets neither.
const toAdminItem = (r) => ({ ...toItem(r), deleted: Boolean(r.is_deleted), status: r.is_deleted ? 'Inactive' : 'Active', stamp: r.stamp || null });

const NOT_FOUND = { status: 404, body: { error: 'Department not found.' } };
const nameTaken = { status: 409, body: { errors: { name: 'Another department already has that name.' } } };
const takenResponse = (row) => ({
  status: 409,
  body: {
    errors: {
      code: row.is_deleted
        ? 'That code belongs to a deleted department. An Admin can restore it, or choose another code.'
        : 'That department code is already in use.',
    },
  },
});
const blockedByHistory = (name, n) => ({
  status: 409,
  body: { error: `${name} is used in ${n ? `${n} job history record${n === 1 ? '' : 's'}` : 'job history'}, so it cannot be deleted.` },
});

function createDepartments({ db, repo, perms }) {
  async function list(user, query) {
    const n = normalizeQuery(query);
    const admin = isAdminRole(user);
    const scope = admin ? n.status : 'active'; // only Admins may look at deleted departments
    const rows = await repo.listDepartments(db, {
      search: n.search, scope, sort: n.sort, dir: n.dir, limit: n.pageSize, offset: (n.page - 1) * n.pageSize,
    });
    const total = rows.length ? Number(rows[0].total) : 0;
    const [canAdd, canEdit, canDelete] = await Promise.all([
      perms.can(user, 'DEPT_ADD'), perms.can(user, 'DEPT_EDIT'), perms.can(user, 'DEPT_DELETE'),
    ]);
    const counts = admin ? await repo.countDepartments(db) : undefined;
    return {
      status: 200,
      body: {
        departments: rows.map(admin ? toAdminItem : toItem),
        status: scope,
        counts,
        total,
        page: n.page,
        pageSize: n.pageSize,
        pages: Math.max(1, Math.ceil(total / n.pageSize)),
        // Lets the screen show or hide buttons. The server still checks every action.
        can: { add: canAdd, edit: canEdit, delete: canDelete, restore: admin, seeDeleted: admin },
      },
    };
  }

  async function get(code) {
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    const row = await repo.findDepartment(db, code);
    return row ? { status: 200, body: { department: toItem(row) } } : NOT_FOUND;
  }

  // The route has already checked DEPT_ADD / DEPT_EDIT. The audit log and the Stamp column name the real person.
  async function create(actor, body) {
    const { errors, value } = validateDepartment(body, { needCode: true });
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    try {
      return await db.txAs(auditName(actor), async (client) => {
        await repo.lockNames(client);
        const taken = await repo.findAnyDepartment(client, value.code);
        if (taken) return takenResponse(taken);
        if (await repo.findNameTaken(client, value.name)) return nameTaken;
        return { status: 201, body: { department: toItem(await repo.insertDepartment(client, value)) } };
      });
    } catch (err) {
      if (err.code === '23505') return takenResponse({ is_deleted: false }); // same code added at the same moment
      throw err;
    }
  }

  async function update(actor, code, body) {
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    const { errors, value } = validateDepartment(body); // any "code" in the body is ignored
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    return db.txAs(auditName(actor), async (client) => {
      await repo.lockNames(client);
      if (await repo.findNameTaken(client, value.name, code)) return nameTaken;
      const row = await repo.updateDepartment(client, code, value);
      return row ? { status: 200, body: { department: toItem(row) } } : NOT_FOUND;
    });
  }

  async function remove(actor, code) {
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    try {
      return await db.txAs(auditName(actor), async (client) => {
        const row = await repo.findDepartment(client, code);
        if (!row) return NOT_FOUND;
        // Friendly check first; the database trigger is the final guard if a record appears in between.
        const used = await repo.countActiveJobHistory(client, code);
        if (used > 0) return blockedByHistory(toItem(row).name, used);
        const done = await repo.softDeleteDepartment(client, code);
        return done ? { status: 200, body: { department: toItem(done) } } : NOT_FOUND;
      });
    } catch (err) {
      if (/Cannot delete department/i.test(String(err.message))) return blockedByHistory('This department');
      throw err;
    }
  }

  async function restore(actor, code) {
    if (!isAdminRole(actor)) return { status: 403, body: { error: 'Only an Admin can restore a department.' } };
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    return db.txAs(auditName(actor), async (client) => {
      await repo.lockNames(client);
      const gone = await repo.findAnyDepartment(client, code);
      if (!gone || !gone.is_deleted) return NOT_FOUND;
      // Restoring must not create two live departments with the same name.
      if (await repo.findNameTaken(client, String(gone.deptname ?? '').trim(), code)) {
        return { status: 409, body: { error: 'Another department already has this name. Rename or delete that one before restoring this one.' } };
      }
      const row = await repo.restoreDepartment(client, code);
      return row ? { status: 200, body: { department: toItem(row) } } : NOT_FOUND;
    });
  }

  return { list, get, create, update, remove, restore };
}

module.exports = { createDepartments, normalizeQuery, VIEW_RIGHTS };
