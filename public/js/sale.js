'use strict';

// Sale details page (S4-DEV-02): the lines of one sale. Opened as /sale.html?transno=TR000001.
// The server checks every right and works out every price; this file only draws what it is given and previews the amount.
// All text goes in with textContent.
const transno = new URLSearchParams(window.location.search).get('transno') || '';
const base = `/api/sales/${encodeURIComponent(transno)}`;
const rowsEl = document.getElementById('rows');
const msgEl = document.getElementById('msg');
const dialog = document.getElementById('line-dialog');
const form = document.getElementById('line-form');
const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const FIELDS = ['prodcode', 'quantity'];
const state = { status: 'active' };
let data = null;
let editing = null; // the line being edited, or null when adding
let opener = null;

function flash(kind, text) { msgEl.className = kind; msgEl.textContent = text; }
function clearMsg() { msgEl.className = ''; msgEl.textContent = ''; }
function showActions() { return data && (data.can.edit || data.can.delete || data.can.restore); }
function cols() { return 4 + (data?.can.seeDeleted ? 2 : 0) + (showActions() ? 1 : 0); }

function emptyRow(text) {
  rowsEl.replaceChildren();
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = cols();
  td.className = 'muted';
  td.textContent = text;
  tr.append(td);
  rowsEl.append(tr);
}

function cell(text, cls) {
  const td = document.createElement('td');
  td.textContent = text;
  if (cls) td.className = cls;
  return td;
}

function render() {
  const { sale, lines, can } = data;
  document.title = `${sale.transno} - Sale Details - Hope, Inc. ERP`;
  document.getElementById('title').textContent = `Sale Details · ${sale.transno}`;
  document.getElementById('summary').hidden = false;
  document.getElementById('balance-link').href = `/balance.html?transno=${encodeURIComponent(sale.transno)}`;
  document.getElementById('s-transno').textContent = sale.transno;
  document.getElementById('s-date').textContent = sale.salesdate || '—';
  document.getElementById('s-customer').textContent = sale.customer ? `${sale.custno} · ${sale.customer}` : sale.custno || '—';
  document.getElementById('s-employee').textContent = sale.employee ? `${sale.empno} · ${sale.employee}` : sale.empno || '—';
  document.getElementById('s-status').textContent = sale.deleted ? 'Inactive (deleted)' : 'Active';
  document.getElementById('add-btn').hidden = !can.add;
  document.getElementById('actions-th').hidden = !showActions();
  document.getElementById('status-th').hidden = !can.seeDeleted;
  document.getElementById('stamp-th').hidden = !can.seeDeleted;
  renderTabs();
  const total = document.getElementById('total');
  total.textContent = PESO.format(data.total);
  if (data.unpriced) {
    const note = document.createElement('span');
    note.className = 'note';
    note.textContent = `${data.unpriced} line${data.unpriced === 1 ? '' : 's'} without a price are not counted`;
    total.append(note);
  }
  const shown = lines.filter((l) => (state.status === 'all' ? true : state.status === 'deleted' ? l.deleted : !l.deleted));
  if (!shown.length) { emptyRow(state.status === 'deleted' ? 'No inactive lines.' : 'This sale has no lines yet.'); return; }
  rowsEl.replaceChildren();
  for (const l of shown) {
    const tr = document.createElement('tr');
    tr.append(cell(`${l.prodcode} · ${l.product}`), cell(String(l.quantity), 'num'));
    const price = cell(l.unitprice == null ? 'No price' : PESO.format(l.unitprice), 'num');
    if (l.unitprice == null) price.title = `No price in force on ${sale.salesdate}`;
    tr.append(price, cell(l.amount == null ? '—' : PESO.format(l.amount), 'num'));
    if (can.seeDeleted) {
      const statusTd = document.createElement('td');
      const sb = document.createElement('span');
      sb.className = `badge${l.deleted ? ' blocked' : ''}`;
      sb.textContent = l.status;
      statusTd.append(sb);
      tr.append(statusTd, cell(l.stamp || '—'));
    }
    if (l.deleted) tr.className = 'row-deleted';
    if (showActions()) {
      const td = document.createElement('td');
      const box = document.createElement('div');
      box.className = 'actions';
      const act = (label, cls, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `btn ${cls}`.trim();
        b.textContent = label;
        b.setAttribute('aria-label', `${label} ${l.prodcode}`);
        b.dataset.act = label.toLowerCase();
        b.dataset.prodcode = l.prodcode;
        b.addEventListener('click', () => fn(b));
        box.append(b);
      };
      if (l.deleted) {
        if (can.restore) act('Restore', '', (b) => restoreLine(l, b));
      } else {
        if (can.edit) act('Edit', '', (b) => openDialog(l, b));
        if (can.delete) act('Delete', 'danger', (b) => askDelete(l, b));
      }
      td.append(box);
      tr.append(td);
    }
    rowsEl.append(tr);
  }
}

async function load() {
  if (!transno) { emptyRow('No sale was chosen. Go back to Sales and open one.'); return; }
  try {
    const res = await fetch(base);
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { data = null; emptyRow('You do not have access to Sale Details. Ask an administrator to assign the View Sale Details right.'); return; }
    if (res.status === 404) { data = null; emptyRow('Sale not found.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load this sale.'); return; }
    data = json;
    render();
  } catch {
    flash('bad', 'Could not reach the server. Please try again.');
  }
}

// ---- Status tabs: Admins only (counted here, the server sends every line to an Admin) ----
const TABS = [['active', 'Active'], ['deleted', 'Inactive'], ['all', 'All']];
function renderTabs() {
  const box = document.getElementById('status-tabs');
  box.hidden = !data.can.seeDeleted;
  if (box.hidden) return;
  const n = { active: 0, deleted: 0, all: data.lines.length };
  for (const l of data.lines) n[l.deleted ? 'deleted' : 'active'] += 1;
  box.replaceChildren();
  for (const [key, label] of TABS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${label} ${n[key]}`;
    b.setAttribute('aria-pressed', String(state.status === key));
    b.addEventListener('click', () => { state.status = key; clearMsg(); render(); });
    box.append(b);
  }
}

// ---- Add / Edit ----
function showErrors(errors = {}) {
  for (const f of FIELDS) {
    const el = form.querySelector(`[data-for="${f}"]`);
    if (el) el.textContent = errors[f] || '';
    form.elements[f].setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
  }
}

// Preview only: the server works out the real price and amount when it saves.
function preview() {
  const opt = data.options.find((o) => o.prodcode === form.elements.prodcode.value);
  const qty = Number(form.elements.quantity.value);
  form.elements.unitprice.value = opt && opt.unitprice != null ? PESO.format(opt.unitprice) : '';
  form.elements.amount.value = opt && opt.unitprice != null && Number.isInteger(qty) && qty >= 1 ? PESO.format(Math.round(opt.unitprice * 100) * qty / 100) : '';
  const missing = noPrice();
  form.querySelector('[data-for="prodcode"]').textContent = missing
    ? `No applicable price for this sale date. A price effective on or before ${data.sale.salesdate} is required. Do not save this line at ₱0.00.`
    : '';
  document.getElementById('save-btn').disabled = missing;
}

// True when the chosen product has no price on the sales date: Save stays off so a line is never saved at ₱0.00.
function noPrice() {
  const opt = data.options.find((o) => o.prodcode === form.elements.prodcode.value);
  return Boolean(opt && opt.unitprice == null);
}

function openDialog(line, trigger) {
  opener = trigger;
  editing = line || null;
  document.getElementById('line-title').textContent = line ? 'Edit Sale Detail' : 'Add Sale Detail';
  form.elements.transno.value = data.sale.transno;
  const select = form.elements.prodcode;
  select.replaceChildren();
  const first = document.createElement('option');
  first.value = '';
  first.textContent = 'Choose...';
  select.append(first);
  for (const p of data.options || []) {
    const o = document.createElement('option');
    o.value = p.prodcode;
    o.textContent = `${p.prodcode} · ${p.product}${p.unitprice == null ? ' (no price)' : ''}`;
    select.append(o);
  }
  select.value = line ? line.prodcode : '';
  form.elements.quantity.value = line ? String(line.quantity) : '';
  showErrors();
  document.getElementById('form-error').textContent = '';
  preview();
  dialog.showModal();
  (line ? form.elements.quantity : select).focus();
}

form.elements.prodcode.addEventListener('change', preview);
form.elements.quantity.addEventListener('input', preview);

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  showErrors();
  document.getElementById('form-error').textContent = '';
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  const body = Object.fromEntries(FIELDS.map((f) => [f, form.elements[f].value]));
  try {
    const res = await fetch(editing ? `${base}/lines/${encodeURIComponent(editing.prodcode)}` : `${base}/lines`, {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      dialog.close();
      flash('ok', editing ? 'The line was updated.' : 'The line was added.');
      load();
    } else if (json.errors) {
      showErrors(json.errors); // the form stays open and the entered values are kept
      const first = FIELDS.find((f) => json.errors[f]);
      if (first) form.elements[first].focus();
    } else {
      document.getElementById('form-error').textContent = json.error || 'Could not save sale detail. Your entered values are retained.';
    }
  } catch {
    document.getElementById('form-error').textContent = 'Could not save sale detail. Your entered values are retained. Check your connection and try again.';
  } finally {
    saveBtn.disabled = noPrice(); // Save stays off when the chosen product has no price
  }
});

dialog.addEventListener('close', () => {
  const again = editing && rowsEl.querySelector(`button[data-act="edit"][data-prodcode="${editing.prodcode}"]`);
  const target = opener && document.contains(opener) ? opener : again || document.getElementById('add-btn');
  target.focus();
});
document.getElementById('cancel-btn').addEventListener('click', () => dialog.close());
document.getElementById('line-close').addEventListener('click', () => dialog.close());
document.getElementById('add-btn').addEventListener('click', (ev) => openDialog(null, ev.currentTarget));

// ---- Delete (with confirmation) and Restore ----
const confirmDialog = document.getElementById('confirm-dialog');
let pending = null;
let confirmOpener = null;

function askDelete(line, trigger) {
  pending = line;
  confirmOpener = trigger;
  document.getElementById('confirm-text').textContent =
    `${line.prodcode} · ${line.product} will be removed from ${data.sale.transno} and the total will change. An Admin can restore the line later.`;
  document.getElementById('confirm-error').textContent = '';
  confirmDialog.showModal();
  document.getElementById('confirm-cancel').focus(); // the safe choice has the focus
}

document.getElementById('confirm-cancel').addEventListener('click', () => confirmDialog.close());
confirmDialog.addEventListener('close', () => {
  const again = pending && rowsEl.querySelector(`button[data-act="delete"][data-prodcode="${pending.prodcode}"]`);
  (confirmOpener && document.contains(confirmOpener) ? confirmOpener : again || document.getElementById('add-btn')).focus();
});
document.getElementById('confirm-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const okBtn = document.getElementById('confirm-ok');
  okBtn.disabled = true;
  try {
    const res = await fetch(`${base}/lines/${encodeURIComponent(pending.prodcode)}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) { confirmDialog.close(); flash('ok', `${pending.prodcode} was removed from this sale.`); load(); }
    else document.getElementById('confirm-error').textContent = json.error || 'Could not delete this line.';
  } catch {
    document.getElementById('confirm-error').textContent = 'Could not reach the server. Please try again.';
  } finally {
    okBtn.disabled = false;
  }
});

async function restoreLine(line, button) {
  button.disabled = true;
  try {
    const res = await fetch(`${base}/lines/${encodeURIComponent(line.prodcode)}/restore`, { method: 'POST' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) { flash('ok', `${line.prodcode} was restored.`); load(); } else { flash('bad', json.error || 'Could not restore this line.'); button.disabled = false; }
  } catch {
    flash('bad', 'Could not reach the server. Please try again.');
    button.disabled = false;
  }
}

load();
