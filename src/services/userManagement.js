'use strict';

const { validateUserFields, ROLES } = require('../validators/user');
const { hashToken, newRawToken, SET_PASSWORD_TTL_MS } = require('./passwordToken');

const UNIQUE_VIOLATION = '23505';
const DUPLICATE_EMAIL = { status: 409, body: { errors: { email: 'An account with this email already exists.' } } };
const NOT_FOUND = { status: 404, body: { error: 'User not found.' } };

// Who can see and manage whom. These rules live on the SERVER; the UI only mirrors them.
//   superadmin: sees and manages everyone (but not their own block state or own role)
//   admin:      sees users and other admins; manages ONLY users; superadmins are invisible
const visibleRoles = (actor) => (actor.role === 'superadmin' ? ROLES : ['admin', 'user']);
const isVisible = (actor, target) => visibleRoles(actor).includes(target.role);
const canManage = (actor, target) => actor.role === 'superadmin' || (actor.role === 'admin' && target.role === 'user');

function toItem(actor, row) {
  return {
    id: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    status: row.status,
    isBlocked: row.is_blocked,
    canManage: canManage(actor, row),
    isSelf: row.user_id === actor.user_id,
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
      return { status: 403, body: { error: 'Only a superadmin can assign roles.' } };
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

    // The new person chooses their own password through a one-time link; nobody else ever sees it.
    const raw = newRawToken();
    await repo.createPasswordToken(db, {
      userId: row.user_id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + SET_PASSWORD_TTL_MS),
    });
    mailer
      .send({
        to: row.email,
        subject: 'Your Hope ERP account',
        text:
          `Hello ${row.first_name},\n\nAn account was created for you. Set your password here (valid 24 hours, one use):\n` +
          `${appUrl}/set-password.html?token=${raw}`,
      })
      .catch((err) => console.error('[mail] failed to send invitation:', err.message));
    return { status: 201, body: { user: toItem(actor, row) } };
  }

  async function update(actor, id, body = {}) {
    const target = await loadTarget(actor, id);
    if (!target) return NOT_FOUND;
    if (!canManage(actor, target)) return { status: 403, body: { error: 'You cannot edit this account.' } };

    const { errors, value } = validateUserFields(body);
    if (Object.keys(errors).length) return { status: 400, body: { errors } };

    let role = target.role;
    if (body.role !== undefined && body.role !== target.role) {
      if (actor.role !== 'superadmin') return { status: 403, body: { error: 'Only a superadmin can assign roles.' } };
      if (target.user_id === actor.user_id) return { status: 400, body: { error: 'You cannot change your own role.' } };
      const r = resolveRole(actor, body.role, target.role);
      if (r.error) return r.error;
      role = r.role;
    }

    try {
      const row = await repo.updateUser(db, target.user_id, { ...value, role });
      return { status: 200, body: { user: toItem(actor, row) } };
    } catch (err) {
      if (err.code === UNIQUE_VIOLATION) return DUPLICATE_EMAIL;
      throw err;
    }
  }

  async function setBlocked(actor, id, blocked) {
    const target = await loadTarget(actor, id);
    if (!target) return NOT_FOUND;
    if (!canManage(actor, target)) return { status: 403, body: { error: 'You cannot change this account.' } };
    if (blocked && target.user_id === actor.user_id) {
      return { status: 400, body: { error: 'You cannot block your own account.' } };
    }
    const row = await repo.setBlocked(db, target.user_id, blocked);
    return { status: 200, body: { user: toItem(actor, row) } };
  }

  return { list, create, update, block: (a, id) => setBlocked(a, id, true), unblock: (a, id) => setBlocked(a, id, false) };
}

module.exports = { createUserManagement, visibleRoles, canManage };
