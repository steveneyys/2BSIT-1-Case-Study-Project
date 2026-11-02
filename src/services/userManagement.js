'use strict';

const { validateUserFields, validateNameFields, ROLES } = require('../validators/user');
const { hashToken, newRawToken, SET_PASSWORD_TTL_MS } = require('./passwordToken');

const UNIQUE_VIOLATION = '23505';
const DUPLICATE_EMAIL = { status: 409, body: { errors: { email: 'An account with this email already exists.' } } };
const NOT_FOUND = { status: 404, body: { error: 'User not found.' } };
const LAST_SUPERADMIN = {
  status: 409,
  body: {
    code: 'last_superadmin',
    error: 'This is the last active Superadmin. You cannot remove, disable or demote this account. Keep at least one active Superadmin.',
  },
};
const SESSION_STALE = { status: 403, body: { error: 'Your account can no longer perform this action.' } };
const SUPERADMIN_ONLY = (what) => ({ status: 403, body: { error: `Only a superadmin can ${what}.` } });

// Who can see and manage whom. These rules live on the SERVER; the UI only mirrors them.
//   superadmin: sees and manages everyone (but not their own block state or own role)
//   admin:      sees users and other admins; manages ONLY users; superadmins are invisible
const visibleRoles = (actor) => (actor.role === 'superadmin' ? ROLES : ['admin', 'user']);
const isVisible = (actor, target) => visibleRoles(actor).includes(target.role);
const canManage = (actor, target) => actor.role === 'superadmin' || (actor.role === 'admin' && target.role === 'user');
const isLiveSuperadmin = (u) => u.role === 'superadmin' && !u.is_blocked && u.status === 'active';

function toItem(actor, row) {
  const isSuper = actor.role === 'superadmin';
  const isSelf = row.user_id === actor.user_id;
  return {
    id: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    status: row.status,
    isBlocked: row.is_blocked,
    canManage: canManage(actor, row),
    isSelf,
    // Buttons the UI may show (the server re-checks every action):
    canSetRights: canManage(actor, row) && row.role === 'user',
    canApprove: isSuper && row.status === 'pending',
    canMakeAdmin: isSuper && row.status === 'active' && row.role === 'user',
    canRemoveAdmin: isSuper && row.role === 'admin' && !isSelf,
  };
}

// Factory so tests can inject a fake repo and mailer.
function createUserManagement({ db, repo, mailer, appUrl }) {
  // Loads a target the actor is allowed to know about. Hidden accounts look exactly like missing ones.
  async function loadTarget(actor, id) {
    const userId = Number.parseInt(id, 10);
    if (!Number.isInteger(userId)) return null;
    const target = await repo.findById(db, userId);
    return target && isVisible(actor, target) ? target : null;
  }

  // Runs fn(connection) -> response. If the target is a live superadmin being removed or disabled, the
  // change happens inside a transaction that first locks all live superadmins, so the last one can
  // never be removed, even by two simultaneous requests.
  async function withSuperadminGuard(actor, target, fn) {
    if (!isLiveSuperadmin(target)) return fn(db);
    return db.tx(async (client) => {
      const live = await repo.lockActiveSuperadmins(client);
      if (live.some((r) => r.user_id === target.user_id) && live.length <= 1) return LAST_SUPERADMIN;
      if (actor.role === 'superadmin' && !live.some((r) => r.user_id === actor.user_id)) return SESSION_STALE;
      return fn(client);
    });
  }

  // The person chooses their own password through a one-time link; nobody else ever sees it.
  async function sendSetPasswordLink(row, subject, intro) {
    const raw = newRawToken();
    await repo.createPasswordToken(db, {
      userId: row.user_id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + SET_PASSWORD_TTL_MS),
      purpose: 'first_password',
    });
    mailer
      .send({
        to: row.email,
        subject,
        text: `Hello ${row.first_name},\n\n${intro} Set your password here (valid 24 hours, one use):\n${appUrl}/set-password.html?token=${raw}`,
      })
      .catch((err) => console.error('[mail] failed to send set-password link:', err.message));
  }

  async function get(actor, id) {
    const target = await loadTarget(actor, id);
    return target ? { status: 200, body: { user: toItem(actor, target) } } : NOT_FOUND;
  }

  async function list(actor, q) {
    const rows = await repo.listUsers(db, { roles: visibleRoles(actor), q: String(q ?? '').trim().slice(0, 100) });
    return { status: 200, body: { users: rows.map((r) => toItem(actor, r)) } };
  }

  function resolveRole(actor, requested, current) {
    if (actor.role !== 'superadmin') return { role: current ?? 'user' }; // admins can never choose a role
    const role = requested ?? current ?? 'user';
    if (!ROLES.includes(role)) return { error: { status: 400, body: { errors: { role: 'Choose a valid role.' } } } };
    return { role };
  }

  async function create(actor, body = {}) {
    const { errors, value } = validateUserFields(body);
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    if (actor.role !== 'superadmin' && body.role !== undefined && body.role !== 'user') {
      return SUPERADMIN_ONLY('assign roles');
    }
    const { role, error } = resolveRole(actor, body.role, 'user');
    if (error) return error;

    let row;
    try {
      row = await repo.insertUser(db, { ...value, role });
    } catch (err) {
      if (err.code === UNIQUE_VIOLATION) return DUPLICATE_EMAIL;
      throw err;
    }

    await sendSetPasswordLink(row, 'Your Hope ERP account', 'An account was created for you.');
    return { status: 201, body: { user: toItem(actor, row) } };
  }

  async function update(actor, id, body = {}) {
    const target = await loadTarget(actor, id);
    if (!target) return NOT_FOUND;
    if (!canManage(actor, target)) return { status: 403, body: { error: 'You cannot edit this account.' } };

    // The email is read-only on Edit User (design), so only the names are read from the request.
    const { errors, value } = validateNameFields(body);
    if (Object.keys(errors).length) return { status: 400, body: { errors } };

    let role = target.role;
    if (body.role !== undefined && body.role !== target.role) {
      if (actor.role !== 'superadmin') return SUPERADMIN_ONLY('assign roles');
      if (target.user_id === actor.user_id) return { status: 400, body: { error: 'You cannot change your own role.' } };
      const r = resolveRole(actor, body.role, target.role);
      if (r.error) return r.error;
      if (r.role !== 'user' && target.status !== 'active') {
        return { status: 400, body: { error: 'Approve this user before giving them a higher role.' } };
      }
      role = r.role;
    }

    const demotes = target.role === 'superadmin' && role !== 'superadmin';
    const run = async (conn) => {
      try {
        const row = await repo.updateUser(conn, target.user_id, { ...value, email: target.email, role });
        return { status: 200, body: { user: toItem(actor, row) } };
      } catch (err) {
        if (err.code === UNIQUE_VIOLATION) return DUPLICATE_EMAIL;
        throw err;
      }
    };
    return demotes ? withSuperadminGuard(actor, target, run) : run(db);
  }

  async function setBlocked(actor, id, blocked) {
    const target = await loadTarget(actor, id);
    if (!target) return NOT_FOUND;
    if (!canManage(actor, target)) return { status: 403, body: { error: 'You cannot change this account.' } };
    if (blocked && target.user_id === actor.user_id) {
      return { status: 400, body: { error: 'You cannot block your own account.' } };
    }
    const run = async (conn) => ({ status: 200, body: { user: toItem(actor, await repo.setBlocked(conn, target.user_id, blocked)) } });
    return blocked ? withSuperadminGuard(actor, target, run) : run(db);
  }

  // Superadmin approves a self-registered account so it can sign in.
  async function approve(actor, id) {
    if (actor.role !== 'superadmin') return SUPERADMIN_ONLY('approve accounts');
    const target = await loadTarget(actor, id);
    if (!target) return NOT_FOUND;
    if (target.status !== 'pending') return { status: 409, body: { error: 'This account is not waiting for approval.' } };
    const row = await repo.setApproved(db, target.user_id);
    if (!row) return { status: 409, body: { error: 'This account is not waiting for approval.' } };
    // Approval does not grant any module rights. The person now sets a first password through a one-time link.
    await sendSetPasswordLink(row, 'Your Hope ERP account was approved', 'Your account was approved.');
    return { status: 200, body: { user: toItem(actor, row) } };
  }

  async function changeRole(actor, id, from, to, action) {
    if (actor.role !== 'superadmin') return SUPERADMIN_ONLY(action);
    const target = await loadTarget(actor, id);
    if (!target) return NOT_FOUND;
    if (target.user_id === actor.user_id) return { status: 400, body: { error: 'You cannot change your own role.' } };
    if (target.role !== from) return { status: 409, body: { error: 'This action does not apply to this account.' } };
    if (to === 'admin' && target.status !== 'active') {
      return { status: 400, body: { error: 'Approve this user before making them an admin.' } };
    }
    const row = await repo.setRole(db, target.user_id, to);
    return { status: 200, body: { user: toItem(actor, row) } };
  }

  return {
    get,
    list,
    create,
    update,
    block: (a, id) => setBlocked(a, id, true),
    unblock: (a, id) => setBlocked(a, id, false),
    approve,
    makeAdmin: (a, id) => changeRole(a, id, 'user', 'admin', 'designate admins'),
    removeAdmin: (a, id) => changeRole(a, id, 'admin', 'user', 'remove admins'),
  };
}

module.exports = { createUserManagement, visibleRoles, canManage };
