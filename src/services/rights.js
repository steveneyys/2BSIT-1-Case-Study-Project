'use strict';

const { visibleRoles } = require('./userManagement');

const NOT_FOUND = { status: 404, body: { error: 'User not found.' } };

// audit_log.action_by is VARCHAR(50) and user_permission.stamp is VARCHAR(60) ("RESTORE <name> <date time>"),
// so the name must stay short. Email, cut to 30 characters, keeps every stamp within its column.
const auditName = (actor) => String(actor.email).slice(0, 30);

// Groups flat catalogue rows into [{moduleCode, moduleName, rights:[{code, description}]}], in catalogue order.
function groupCatalog(rows) {
  const modules = [];
  for (const r of rows) {
    let m = modules.find((x) => x.moduleCode === r.module_code);
    if (!m) modules.push((m = { moduleCode: r.module_code, moduleName: r.module_name, rights: [] }));
    m.rights.push({ code: r.right_code, description: r.description });
  }
  return modules;
}

function createRights({ db, repo, userRepo }) {
  // Only plain Users have per-action rights. Admins and superadmins already have every right, so the
  // dialog is not offered for them. Hidden accounts look like missing ones (same rule as User Management).
  async function loadTarget(actor, id) {
    const userId = Number.parseInt(id, 10);
    if (!Number.isInteger(userId)) return { error: NOT_FOUND };
    const target = await userRepo.findById(db, userId);
    if (!target || !visibleRoles(actor).includes(target.role)) return { error: NOT_FOUND };
    if (target.role !== 'user') {
      return { error: { status: 400, body: { error: 'Admins and superadmins already have all rights. Rights apply to users only.' } } };
    }
    return { target };
  }

  async function catalog() {
    return { status: 200, body: { modules: groupCatalog(await repo.listCatalog(db)) } };
  }

  async function getUserRights(actor, id) {
    const { target, error } = await loadTarget(actor, id);
    if (error) return error;
    return {
      status: 200,
      body: {
        user: { id: target.user_id, firstName: target.first_name, lastName: target.last_name },
        rights: (await repo.listUserRights(db, target.user_id)).sort(),
      },
    };
  }

  // Replaces the user's rights with exactly the list sent. Only differences are written, so the audit
  // log shows real changes (one row per right granted or removed) and nothing else.
  async function setUserRights(actor, id, body = {}) {
    const { target, error } = await loadTarget(actor, id);
    if (error) return error;

    if (!Array.isArray(body.rights) || body.rights.some((c) => typeof c !== 'string') || body.rights.length > 200) {
      return { status: 400, body: { errors: { rights: 'Send the list of rights as an array of codes.' } } };
    }
    const wanted = [...new Set(body.rights)];
    const known = new Set((await repo.listCatalog(db)).map((r) => r.right_code));
    const unknown = wanted.filter((c) => !known.has(c));
    if (unknown.length) {
      return { status: 400, body: { errors: { rights: `Unknown right: ${unknown[0].slice(0, 40)}` } } };
    }

    const changes = await db.txAs(auditName(actor), async (client) => {
      if (!(await repo.lockUser(client, target.user_id))) return null;
      const current = new Set(await repo.listUserRights(client, target.user_id));
      const grant = wanted.filter((c) => !current.has(c));
      const revoke = [...current].filter((c) => !wanted.includes(c));
      await repo.grantRights(client, target.user_id, grant);
      await repo.revokeRights(client, target.user_id, revoke);
      return { granted: grant.sort(), revoked: revoke.sort() };
    });
    if (!changes) return NOT_FOUND;
    return { status: 200, body: { rights: wanted.sort(), changes } };
  }

  return { catalog, getUserRights, setUserRights };
}

module.exports = { createRights, auditName, groupCatalog };
