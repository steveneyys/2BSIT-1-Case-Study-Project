'use strict';

// S4-DEV-07: sales soft delete and restore, with Status and Stamp.
const test = require('node:test');
const assert = require('node:assert');
const repo = require('../src/repositories/saleRepo');
const { createSales } = require('../src/services/sales');
const { createPermissions } = require('../src/services/permissions');

const user = (id, role) => ({ user_id: id, first_name: 'F', last_name: 'L', email: `u${id}@x.test`, role, is_blocked: false, status: 'active' });
const admin = () => user(1, 'admin');
const U = () => user(5, 'user');
const perms = (rights) => createPermissions({ db: {}, repo: { listUserRights: async () => rights } });
const recorder = (rows = [], rowCount = 1) => { const calls = []; return { calls, query: async (sql, params) => { calls.push({ sql, params }); return { rows, rowCount }; } }; };

// ---- SQL ----
test('softDeleteSale / restoreSale: only flip rows in the right state', async () => {
  const db = recorder([{ transno: 'TR000001', is_deleted: false }]);
  assert.strictEqual(await repo.softDeleteSale(db, 'TR000001'), true);
  assert.match(db.calls[0].sql, /SET is_deleted = true WHERE transno = \$1 AND NOT is_deleted/);
  await repo.restoreSale(db, 'TR000001');
  assert.match(db.calls[1].sql, /SET is_deleted = false WHERE transno = \$1 AND is_deleted/);
  assert.strictEqual(await repo.softDeleteSale(recorder([], 0), 'TR000001'), false);
  assert.strictEqual(await repo.restoreSale(recorder([], 0), 'TR000001'), null);
});

test('countActiveChildren: counts only ACTIVE lines and payments of that sale', async () => {
  const db = recorder([{ lines: '2', payments: '1' }]);
  assert.deepStrictEqual(await repo.countActiveChildren(db, 'TR000001'), { lines: 2, payments: 1 });
  assert.match(db.calls[0].sql, /salesdetail_active/);
  assert.match(db.calls[0].sql, /payment_active/);
  assert.deepStrictEqual(db.calls[0].params, ['TR000001']);
});

// ---- service ----
let auditSeen = null;
const fakeDb = () => ({ txAs: async (name, fn) => { auditSeen = name; return fn({}); } });
const ROW = { transno: 'TR000001', salesdate: '2026-10-01', custno: 'C0001', custname: 'Globus', empno: '00005', lastname: 'Smith', firstname: 'John', is_deleted: false, stamp: 'DELETE u1' };
function svc(over = {}) {
  const st = { deleted: 0, restored: 0 };
  const r = {
    findSale: async () => ROW,
    countActiveChildren: async () => ({ lines: 0, payments: 0 }),
    softDeleteSale: async () => { st.deleted += 1; return true; },
    restoreSale: async () => { st.restored += 1; return { ...ROW, is_deleted: false, stamp: 'UPDATE u1' }; },
    ...over,
  };
  return { svc: createSales({ db: fakeDb(), repo: r, perms: perms([]) }), st };
}

test('delete: soft deletes a sale with nothing linked, as the actor; only the number comes back', async () => {
  const { svc: s, st } = svc();
  const r = await s.remove(U(), 'TR000001');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body, { sale: { transno: 'TR000001' } });
  assert.strictEqual(st.deleted, 1);
  assert.strictEqual(auditSeen, 'u5@x.test');
});

test('delete: refused while active lines or payments exist, and nothing is deleted (no cascade)', async () => {
  const { svc: s, st } = svc({ countActiveChildren: async () => ({ lines: 2, payments: 1 }) });
  const r = await s.remove(U(), 'TR000001');
  assert.strictEqual(r.status, 409);
  assert.strictEqual(r.body.blocked, true);
  assert.match(r.body.error, /Cannot delete TR000001: active details or payments exist\. This transaction has 2 active line items and 1 active payment\./);
  assert.match(r.body.error, /Resolve the linked records before deleting\. Nothing is deleted automatically\./);
  assert.strictEqual(st.deleted, 0);
  const one = await svc({ countActiveChildren: async () => ({ lines: 1, payments: 0 }) }).svc.remove(U(), 'TR000001');
  assert.match(one.body.error, /has 1 active line item\./);
});

test('delete: the database trigger is the last guard when a record appears in between', async () => {
  const { svc: s } = svc({ softDeleteSale: async () => { throw new Error('Cannot delete sales row: 1 active related record(s) still exist.'); } });
  const r = await s.remove(U(), 'TR000001');
  assert.strictEqual(r.status, 409);
  assert.strictEqual(r.body.blocked, true);
  await assert.rejects(svc({ softDeleteSale: async () => { throw new Error('boom'); } }).svc.remove(U(), 'TR000001'), /boom/);
});

test('delete: bad number, missing sale and an already deleted sale are 404', async () => {
  assert.strictEqual((await svc().svc.remove(U(), 'nope')).status, 404);
  assert.strictEqual((await svc({ findSale: async () => null }).svc.remove(U(), 'TR000001')).status, 404);
  assert.strictEqual((await svc({ findSale: async () => ({ ...ROW, is_deleted: true }) }).svc.remove(U(), 'TR000001')).status, 404);
  assert.strictEqual((await svc({ softDeleteSale: async () => false }).svc.remove(U(), 'TR000001')).status, 404);
});

test('restore: Admin only; the sale must be deleted; the reply carries Status and Stamp', async () => {
  const gone = { findSale: async () => ({ ...ROW, is_deleted: true }) };
  assert.strictEqual((await svc(gone).svc.restore(U(), 'TR000001')).status, 403);
  const { svc: s, st } = svc(gone);
  const r = await s.restore(admin(), 'TR000001');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual([r.body.sale.status, r.body.sale.stamp], ['Active', 'UPDATE u1']);
  assert.strictEqual(st.restored, 1);
  assert.strictEqual((await svc().svc.restore(admin(), 'TR000001')).status, 404); // not deleted
  assert.strictEqual((await svc(gone).svc.restore(admin(), 'bad')).status, 404);
});

test('restore: a deleted customer or salesperson blocks it with a clear message', async () => {
  const { svc: s } = svc({ findSale: async () => ({ ...ROW, is_deleted: true }), restoreSale: async () => { throw new Error('Cannot restore sales: customer C0001 is deleted. Restore it first.'); } });
  const r = await s.restore(admin(), 'TR000001');
  assert.strictEqual(r.status, 409);
  assert.match(r.body.error, /Restore them first/);
});

test('list: Admins get Status and Stamp for deleted sales and can restore; users cannot see them at all', async () => {
  const rows = [{ ...ROW, is_deleted: true, total: '0', lines: '0', unpriced: '0', total_rows: '1' }];
  let scope;
  const l = createSales({ db: {}, perms: perms(['SALE_DELETE']), repo: { listSales: async (_d, o) => { scope = o.scope; return rows; }, countSales: async () => ({ active: 0, deleted: 1, all: 1 }) } });
  const a = (await l.list(admin(), { status: 'deleted' })).body;
  assert.strictEqual(scope, 'deleted');
  assert.deepStrictEqual([a.sales[0].status, a.sales[0].stamp, a.sales[0].deleted, a.can.restore, a.can.delete], ['Inactive', 'DELETE u1', true, true, true]);
  const u = (await l.list(U(), { status: 'deleted' })).body;
  assert.strictEqual(scope, 'active');
  assert.deepStrictEqual([u.can.restore, u.can.delete, u.sales[0].status, u.sales[0].stamp], [false, true, undefined, undefined]);
});
