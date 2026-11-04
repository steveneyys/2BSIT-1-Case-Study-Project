'use strict';

const {
  validateUserFields,
  validateNameFields,
  ROLES,
} = require('../validators/user');
const {
  hashToken,
  newRawToken,
  SET_PASSWORD_TTL_MS,
} = require('./passwordToken');

const UNIQUE_VIOLATION = '23505';
const DUPLICATE_EMAIL = {
  status: 409,
  body: {
    errors: {
      email: 'An account with this email already exists.',
    },
  },
};
const NOT_FOUND = { status: 404, body: { error: 'User not found.' } };
const LAST_SUPERADMIN = {
  status: 409,
  body: {
    code: 'last_superadmin',
    error:
      'This is the last active Superadmin. You cannot remove, disable or demote this account. Keep at least one active Superadmin.',
  },
};
const SESSION_STALE = {
  status: 403,
  body: { error: 'Your account can no longer perform this action.' },
};
const SUPERADMIN_ONLY = (what) => ({
  status: 403,
  body: { error: `Only a superadmin can ${what}.` },
});

const visibleRoles = (actor) =>
  actor.role === 'superadmin' ? ROLES : ['admin', 'user'];

const isVisible = (actor, target) =>
  visibleRoles(actor).includes(target.role);

const canManage = (actor, target) =>
  actor.role === 'superadmin' ||
  (actor.role === 'admin' && target.role === 'user');

const isLiveSuperadmin = (user) =>
  user.role === 'superadmin' &&
  !user.is_blocked &&
  user.status === 'active';

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
    canSetRights: canManage(actor, row) && row.role === 'user',
    canApprove: isSuper && row.status === 'pending',
    canMakeAdmin:
      isSuper && row.status === 'active' && row.role === 'user',
    canRemoveAdmin: isSuper && row.role === 'admin' && !isSelf,
  };
}

function createUserManagement({ db, repo, mailer, appUrl }) {
  async function loadTarget(actor, id) {
    const userId = Number.parseInt(id, 10);
    if (!Number.isInteger(userId)) return null;

    const target = await repo.findById(db, userId);
    return target && isVisible(actor, target) ? target : null;
  }

  async function withSuperadminGuard(actor, target, fn) {
    if (!isLiveSuperadmin(target)) return fn(db);

    return db.tx(async (client) => {
      const live = await repo.lockActiveSuperadmins(client);

      if (
        live.some((row) => row.user_id === target.user_id) &&
        live.length <= 1
      ) {
        return LAST_SUPERADMIN;
      }

      if (
        actor.role === 'superadmin' &&
        !live.some((row) => row.user_id === actor.user_id)
      ) {
        return SESSION_STALE;
      }

      return fn(client);
    });
  }

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
        text:
          `Hello ${row.first_name},\n\n${intro} ` +
          'Set your password here (valid 24 hours, one use):\n' +
          `${appUrl}/set-password.html?token=${raw}`,
      })
      .catch((err) =>
        console.error('[mail] failed to send set-password link:', err.message)
      );
  }

  function sendApprovalEmail(row) {
    mailer
      .send({
        to: row.email,
        subject: 'Your Hope ERP account was approved',
        text:
          `Hello ${row.first_name},\n\n` +
          'Your Hope ERP account has been approved. You can now sign in ' +
          'using the email address and password you chose during registration.',
      })
      .catch((err) =>
        console.error('[mail] failed to send approval email:', err.message)
      );
  }

  async function get(actor, id) {
    const target = await loadTarget(actor, id);

    return target
      ? { status: 200, body: { user: toItem(actor, target) } }
      : NOT_FOUND;
  }

  async function list(actor, q) {
    const rows = await repo.listUsers(db, {
      roles: visibleRoles(actor),
      q: String(q ?? '').trim().slice(0, 100),
    });

    return {
      status: 200,
      body: { users: rows.map((row) => toItem(actor, row)) },
    };
  }

  function resolveRole(actor, requested, current) {
    if (actor.role !== 'superadmin') {
      return { role: current ?? 'user' };
    }

    const role = requested ?? current ?? 'user';

    if (!ROLES.includes(role)) {
      return {
        error: {
          status: 400,
          body: { errors: { role: 'Choose a valid role.' } },
        },
      };
    }

    return { role };
  }

  async function create(actor, body = {}) {
    const { errors, value } = validateUserFields(body);

    if (Object.keys(errors).length) {
      return { status: 400, body: { errors } };
    }

    if (
      actor.role !== 'superadmin' &&
      body.role !== undefined &&
      body.role !== 'user'
    ) {
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

    await sendSetPasswordLink(
      row,
      'Your Hope ERP account',
      'An account was created for you.'
    );

    return { status: 201, body: { user: toItem(actor, row) } };
  }

  async function update(actor, id, body = {}) {
    const target = await loadTarget(actor, id);
    if (!target) return NOT_FOUND;

    if (!canManage(actor, target)) {
      return {
        status: 403,
        body: { error: 'You cannot edit this account.' },
      };
    }

    const { errors, value } = validateNameFields(body);
    if (Object.keys(errors).length) {
      return { status: 400, body: { errors } };
    }

    let role = target.role;

    if (body.role !== undefined && body.role !== target.role) {
      if (actor.role !== 'superadmin') {
        return SUPERADMIN_ONLY('assign roles');
      }

      if (target.user_id === actor.user_id) {
        return {
          status: 400,
          body: { error: 'You cannot change your own role.' },
        };
      }

      const roleResult = resolveRole(actor, body.role, target.role);
      if (roleResult.error) return roleResult.error;

      if (roleResult.role !== 'user' && target.status !== 'active') {
        return {
          status: 400,
          body: { error: 'Approve this user before giving them a higher role.' },
        };
      }

      role = roleResult.role;
    }

    const demotes =
      target.role === 'superadmin' && role !== 'superadmin';

    const run = async (conn) => {
      try {
        const row = await repo.updateUser(conn, target.user_id, {
          ...value,
          email: target.email,
          role,
        });

        return { status: 200, body: { user: toItem(actor, row) } };
      } catch (err) {
        if (err.code === UNIQUE_VIOLATION) return DUPLICATE_EMAIL;
        throw err;
      }
    };

    return demotes
      ? withSuperadminGuard(actor, target, run)
      : run(db);
  }

  async function setBlocked(actor, id, blocked) {
    const target = await loadTarget(actor, id);
    if (!target) return NOT_FOUND;

    if (!canManage(actor, target)) {
      return {
        status: 403,
        body: { error: 'You cannot change this account.' },
      };
    }

    if (blocked && target.user_id === actor.user_id) {
      return {
        status: 400,
        body: { error: 'You cannot block your own account.' },
      };
    }

    const run = async (conn) => ({
      status: 200,
      body: {
        user: toItem(
          actor,
          await repo.setBlocked(conn, target.user_id, blocked)
        ),
      },
    });

    return blocked
      ? withSuperadminGuard(actor, target, run)
      : run(db);
  }

  async function approve(actor, id) {
    if (actor.role !== 'superadmin') {
      return SUPERADMIN_ONLY('approve accounts');
    }

    const target = await loadTarget(actor, id);
    if (!target) return NOT_FOUND;

    if (target.status !== 'pending') {
      return {
        status: 409,
        body: { error: 'This account is not waiting for approval.' },
      };
    }

    if (!target.email_verified_at) {
      return {
        status: 409,
        body: {
          error: 'This user must confirm their email before approval.',
        },
      };
    }

    const row = await repo.setApproved(db, target.user_id);

    if (!row) {
      return {
        status: 409,
        body: { error: 'This account is not waiting for approval.' },
      };
    }

    // Registered users already chose a password. Legacy accounts with no
    // password still receive the original one-time set-password link.
    if (target.password_hash) {
      sendApprovalEmail(row);
    } else {
      await sendSetPasswordLink(
        row,
        'Your Hope ERP account was approved',
        'Your account was approved.'
      );
    }

    return { status: 200, body: { user: toItem(actor, row) } };
  }

  async function changeRole(actor, id, from, to, action) {
    if (actor.role !== 'superadmin') {
      return SUPERADMIN_ONLY(action);
    }

    const target = await loadTarget(actor, id);
    if (!target) return NOT_FOUND;

    if (target.user_id === actor.user_id) {
      return {
        status: 400,
        body: { error: 'You cannot change your own role.' },
      };
    }

    if (target.role !== from) {
      return {
        status: 409,
        body: { error: 'This action does not apply to this account.' },
      };
    }

    if (to === 'admin' && target.status !== 'active') {
      return {
        status: 400,
        body: { error: 'Approve this user before making them an admin.' },
      };
    }

    const row = await repo.setRole(db, target.user_id, to);

    return { status: 200, body: { user: toItem(actor, row) } };
  }

  return {
    get,
    list,
    create,
    update,
    block: (actor, id) => setBlocked(actor, id, true),
    unblock: (actor, id) => setBlocked(actor, id, false),
    approve,
    makeAdmin: (actor, id) =>
      changeRole(actor, id, 'user', 'admin', 'designate admins'),
    removeAdmin: (actor, id) =>
      changeRole(actor, id, 'admin', 'user', 'remove admins'),
  };
}

module.exports = { createUserManagement, visibleRoles, canManage };