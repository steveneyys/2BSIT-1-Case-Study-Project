'use strict';

// Read-only access to audit_log (the table is append-only; nothing here writes to it).
// The filters are always passed as parameters; the SQL text itself never changes with the input.
const WHERE = `
  WHERE ($1::date IS NULL OR a.action_at >= ($1::date)::timestamp AT TIME ZONE 'Asia/Manila')
    AND ($2::date IS NULL OR a.action_at <  (($2::date) + 1)::timestamp AT TIME ZONE 'Asia/Manila')
    AND ($3::text IS NULL OR a.action_by = $3)
    AND ($4::text IS NULL OR a.table_name = $4)
    AND ($5::text IS NULL OR a.action = $5)
    AND ($6::text IS NULL OR a.record_key ILIKE '%' || $6 || '%' ESCAPE '\\')`;

const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

// One page of events, newest first, with the person's name and role when the actor is a known account.
async function listEvents(db, f) {
  const { rows } = await db.query(
    `SELECT a.audit_id, to_char(a.action_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD HH24:MI:SS') AS at,
            a.table_name, a.action, a.record_key, a.action_by, a.old_values, a.new_values,
            u.first_name, u.last_name, u.role,
            count(*) OVER () AS total
       FROM audit_log a
       LEFT JOIN app_user u ON lower(u.email) = lower(a.action_by)
       ${WHERE}
      ORDER BY a.action_at DESC, a.audit_id DESC
      LIMIT $7 OFFSET $8`,
    [f.from, f.to, f.actor, f.module, f.action, f.ref ? escapeLike(f.ref) : null, f.pageSize, (f.page - 1) * f.pageSize]
  );
  return rows;
}

// Total for a page past the end (the window count is empty when no row comes back).
async function countEvents(db, f) {
  const { rows } = await db.query(
    `SELECT count(*)::int AS n FROM audit_log a ${WHERE}`,
    [f.from, f.to, f.actor, f.module, f.action, f.ref ? escapeLike(f.ref) : null]
  );
  return rows[0].n;
}

async function listActors(db) {
  const { rows } = await db.query('SELECT DISTINCT action_by FROM audit_log ORDER BY action_by LIMIT 500');
  return rows.map((r) => r.action_by);
}

module.exports = { listEvents, countEvents, listActors, escapeLike };
