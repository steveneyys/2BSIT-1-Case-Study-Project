'use strict';

const { parseAuditQuery, MODULES, ACTIONS } = require('../validators/audit');

// Fields that must never be shown, whatever table they come from (password_hash is already left out by the
// database trigger for app_user; this is the second layer).
const SENSITIVE = /pass(word)?|hash|token|secret|otp|credential|api[_-]?key/i;
// Bookkeeping that changes on every write; it is not a business change.
const NOISE = new Set(['stamp']);
const MAX_VALUE = 200;

const show = (v) => {
  if (v === null || v === undefined) return null;
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return s.length > MAX_VALUE ? `${s.slice(0, MAX_VALUE)}…` : s;
};
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

// The fields that changed: for Add every value that was set; otherwise only those whose value differs.
function changesOf(action, oldValues, newValues) {
  const before = obj(oldValues);
  const after = obj(newValues);
  const out = [];
  for (const field of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
    if (NOISE.has(field)) continue;
    if (action === 'ADD') {
      if (after[field] === null || after[field] === undefined) continue;
    } else if (same(before[field], after[field])) continue;
    if (SENSITIVE.test(field)) { out.push({ field, redacted: true }); continue; }
    out.push({ field, old: action === 'ADD' ? null : show(before[field]), new: show(after[field]) });
  }
  return out;
}

function toEvent(r) {
  const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
  return {
    id: String(r.audit_id),
    at: r.at,
    actor: { id: r.action_by, name: name || null, role: r.role || null },
    module: MODULES[r.table_name] || r.table_name,
    moduleKey: r.table_name,
    action: r.action,
    actionLabel: ACTIONS[r.action] || r.action,
    target: r.record_key || '—',
    changes: changesOf(r.action, r.old_values, r.new_values),
  };
}

function createAudit({ db, repo }) {
  // The route already requires the Superadmin role; checking it again here keeps the service safe if it is ever
  // wired to another route. Nobody else gets even a key back.
  const allowed = (user) => user?.role === 'superadmin';
  const forbidden = () => ({ status: 403, body: { error: 'Audit viewer is restricted to Superadmin.' } });

  async function list(user, query) {
    if (!allowed(user)) return forbidden();
    const { errors, value } = parseAuditQuery(query);
    if (Object.keys(errors).length) return { status: 400, body: { errors } };
    const rows = await repo.listEvents(db, value);
    const total = rows.length ? Number(rows[0].total) : value.page > 1 ? await repo.countEvents(db, value) : 0;
    const pages = Math.max(1, Math.ceil(total / value.pageSize));
    return { status: 200, body: { events: rows.map(toEvent), page: value.page, pageSize: value.pageSize, total, pages } };
  }

  async function options(user) {
    if (!allowed(user)) return forbidden();
    const actors = await repo.listActors(db);
    return {
      status: 200,
      body: {
        actors,
        modules: Object.entries(MODULES).map(([key, label]) => ({ key, label })),
        actions: Object.entries(ACTIONS).map(([key, label]) => ({ key, label })),
      },
    };
  }

  return { list, options };
}

module.exports = { createAudit, changesOf, toEvent };
