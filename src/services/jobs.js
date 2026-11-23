'use strict';

const { validateJob, CODE_RE } = require('../validators/job');
const { auditName } = require('./rights');
const { isAdminRole } = require('./permissions');

const SORT_KEYS = ['code', 'description'];
const STATUSES = ['active', 'deleted', 'all'];
const PAGE_SIZES = [10, 25, 50, 100];
const VIEW_RIGHTS = ['JOB_ADD', 'JOB_EDIT', 'JOB_DELETE']; // holding any job right opens the screen

function normalizeQuery(q = {}) {
  const search = String(q.search ?? '').trim().slice(0, 100);
  const status = STATUSES.includes(q.status) ? q.status : 'active';
  const sort = SORT_KEYS.includes(q.sort) ? q.sort : 'code';
  const dir = q.dir === 'desc' ? 'desc' : 'asc';
  const pageSize = PAGE_SIZES.includes(Number(q.pageSize)) ? Number(q.pageSize) : 25;
  const page = Math.min(Math.max(Number.parseInt(q.page, 10) || 1, 1), 100000);
  return { search, status, sort, dir, pageSize, page };
}

const toItem = (r) => ({ code: r.jobcode, description: String(r.jobdesc ?? '').trim() });
// Admins and superadmins also see the Status and the Stamp; everyone else gets neither.
const toAdminItem = (r) => ({ ...toItem(r), deleted: Boolean(r.is_deleted), status: r.is_deleted ? 'Inactive' : 'Active', stamp: r.stamp || null });

const NOT_FOUND = { status: 404, body: { error: 'Job not found.' } };
const nameTaken = { status: 409, body: { errors: { description: 'Another job already has that description.' } } };
const takenResponse = (row) => ({
  status: 409,
  body: {
    errors: {
      code: row.is_deleted
        ? 'That code belongs to a deleted job. An Admin can restore it, or choose another code.'
        : 'That job code is already in use.',
    },
  },
});
const blockedByHistory = (description, n) => ({
  status: 409,
  body: { error: `${description} is used in ${n ? `${n} job history record${n === 1 ? '' : 's'}` : 'job history'}, so it cannot be deleted.` },
});

function createJobs({ db, repo, perms }) {
  async function list(user, query) {
    const n = normalizeQuery(query);
    const admin = isAdminRole(user);
    const scope = admin ? n.status : 'active'; // only Admins may look at deleted jobs
    const rows = await repo.listJobs(db, {
      search: n.search, scope, sort: n.sort, dir: n.dir, limit: n.pageSize, offset: (n.page - 1) * n.pageSize,
    });
    const total = rows.length ? Number(rows[0].total) : 0;
    const [canAdd, canEdit, canDelete] = await Promise.all([
      perms.can(user, 'JOB_ADD'), perms.can(user, 'JOB_EDIT'), perms.can(user, 'JOB_DELETE'),
    ]);
    const counts = admin ? await repo.countJobs(db) : undefined;
    return {
      status: 200,
      body: {
        jobs: rows.map(admin ? toAdminItem : toItem),
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
    const row = await repo.findJob(db, code);
    return row ? { status: 200, body: { job: toItem(row) } } : NOT_FOUND;
  }

  // The route has already checked JOB_ADD / JOB_EDIT. The audit log and the Stamp column description the real person.
  async function create(actor, body) {
    const { errors, value } = validateJob(body, { needCode: true });
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    try {
      return await db.txAs(auditName(actor), async (client) => {
        await repo.lockNames(client);
        const taken = await repo.findAnyJob(client, value.code);
        if (taken) return takenResponse(taken);
        if (await repo.findNameTaken(client, value.description)) return nameTaken;
        return { status: 201, body: { job: toItem(await repo.insertJob(client, value)) } };
      });
    } catch (err) {
      if (err.code === '23505') return takenResponse({ is_deleted: false }); // same code added at the same moment
      throw err;
    }
  }

  async function update(actor, code, body) {
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    const { errors, value } = validateJob(body); // any "code" in the body is ignored
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    return db.txAs(auditName(actor), async (client) => {
      await repo.lockNames(client);
      if (await repo.findNameTaken(client, value.description, code)) return nameTaken;
      const row = await repo.updateJob(client, code, value);
      return row ? { status: 200, body: { job: toItem(row) } } : NOT_FOUND;
    });
  }

  async function remove(actor, code) {
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    try {
      return await db.txAs(auditName(actor), async (client) => {
        const row = await repo.findJob(client, code);
        if (!row) return NOT_FOUND;
        // Friendly check first; the database trigger is the final guard if a record appears in between.
        const used = await repo.countActiveJobHistory(client, code);
        if (used > 0) return blockedByHistory(toItem(row).description, used);
        const done = await repo.softDeleteJob(client, code);
        return done ? { status: 200, body: { job: toItem(done) } } : NOT_FOUND;
      });
    } catch (err) {
      if (/Cannot delete job/i.test(String(err.message))) return blockedByHistory('This job');
      throw err;
    }
  }

  async function restore(actor, code) {
    if (!isAdminRole(actor)) return { status: 403, body: { error: 'Only an Admin can restore a job.' } };
    if (!CODE_RE.test(String(code))) return NOT_FOUND;
    return db.txAs(auditName(actor), async (client) => {
      await repo.lockNames(client);
      const gone = await repo.findAnyJob(client, code);
      if (!gone || !gone.is_deleted) return NOT_FOUND;
      // Restoring must not create two live jobs with the same description.
      if (await repo.findNameTaken(client, String(gone.jobdesc ?? '').trim(), code)) {
        return { status: 409, body: { error: 'Another job already has this description. Rename or delete that one before restoring this one.' } };
      }
      const row = await repo.restoreJob(client, code);
      return row ? { status: 200, body: { job: toItem(row) } } : NOT_FOUND;
    });
  }

  return { list, get, create, update, remove, restore };
}

module.exports = { createJobs, normalizeQuery, VIEW_RIGHTS };
