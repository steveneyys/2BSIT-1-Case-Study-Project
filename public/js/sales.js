'use strict';

// Sales list and the New Sale / Edit Sale header form (S4-DEV-01). Details link: S4-DEV-02.
// The server checks every right; this file only draws what it is given. All text goes in with textContent.
const rowsEl = document.getElementById('rows');
const msgEl = document.getElementById('msg');
const searchEl = document.getElementById('search');
const sizeEl = document.getElementById('pageSize');
const prevEl = document.getElementById('prev');
const nextEl = document.getElementById('next');
const state = { page: 1, sort: 'transno', dir: 'desc', status: 'active' };
let can = { add: false, edit: false, delete: false, details: false, restore: false, seeDeleted: false };
let opener = null;
let editing = null; // the sale being edited, or null when adding
let timer = null;
let requestId = 0;

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const FIELDS = ['salesdate', 'custno', 'empno'];
const dialog = document.getElementById('sale-dialog');
const form = document.getElementById('sale-form');

function flash(kind, text) { msgEl.className = kind; msgEl.textContent = text; }
function clearMsg() { msgEl.className = ''; msgEl.textContent = ''; }
function showActions() { return can.details || can.edit; }
function cols() { return 5 + (can.seeDeleted ? 2 : 0) + (showActions() ? 1 : 0); }
function filtered() { return Boolean(searchEl.value.trim()); }

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

function render(data) {
  can = data.can || can;
  document.getElementById('add-btn').hidden = !can.add;
  document.getElementById('actions-th').hidden = !showActions();
  document.getElementById('status-th').hidden = !can.seeDeleted;
  document.getElementById('stamp-th').hidden = !can.seeDeleted;
  renderTabs(data.counts);
  document.getElementById('clear').hidden = !filtered();
  if (!data.sales.length) {
    emptyRow(filtered() ? 'No sales match your search.' : 'No sales found.');
  } else {
    rowsEl.replaceChildren();
    for (const s of data.sales) {
      const tr = document.createElement('tr');
      const numTd = document.createElement('td');
      if (can.details) { // the transaction number opens the sale details (S4-DEV-02); the server re-checks View Sale Details
        const link = document.createElement('a');
        link.href = `/sale.html?transno=${encodeURIComponent(s.transno)}`;
        link.textContent = s.transno;
        link.setAttribute('aria-label', `Open details of ${s.transno}`);
        numTd.append(link);
      } else numTd.textContent = s.transno;
      tr.append(numTd, cell(s.salesdate || '—'));
      tr.append(cell(s.customer ? `${s.custno} · ${s.customer}` : s.custno || '—'));
      tr.append(cell(s.employee ? `${s.empno} · ${s.employee}` : s.empno || '—'));
      const total = cell(PESO.format(s.total ?? 0), 'num');
      if (s.unpriced) { // a line with no price on the sales date is not in the total: say so
        const note = document.createElement('span');
        note.className = 'note';
        note.textContent = `${s.unpriced} line${s.unpriced === 1 ? '' : 's'} without a price`;
        total.append(note);
      }
      tr.append(total);
      if (can.seeDeleted) {
        const statusTd = document.createElement('td');
        const sb = document.createElement('span');
        sb.className = `badge${s.deleted ? ' blocked' : ''}`;
        sb.textContent = s.status;
        statusTd.append(sb);
        tr.append(statusTd, cell(s.stamp || '—'));
      }
      if (s.deleted) tr.className = 'row-deleted';
      if (showActions()) {
        const actionsTd = document.createElement('td');
        const box = document.createElement('div');
        box.className = 'actions';
        if (can.details) {
          const a = document.createElement('a');
          a.className = 'btn';
          a.href = `/sale.html?transno=${encodeURIComponent(s.transno)}`;
          a.textContent = 'Details';
          a.setAttribute('aria-label', `Details of ${s.transno}`);
          a.dataset.act = 'details';
          a.dataset.transno = s.transno;
          box.append(a);
        }
        if (can.edit && !s.deleted) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn';
          b.textContent = 'Edit';
          b.setAttribute('aria-label', `Edit ${s.transno}`);
          b.dataset.act = 'edit';
          b.dataset.transno = s.transno;
          b.addEventListener('click', () => openDialog(s, b));
          box.append(b);
        }
        actionsTd.append(box);
        tr.append(actionsTd);
      }
      rowsEl.append(tr);
    }
  }
  const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(data.page * data.pageSize, data.total);
  document.getElementById('count').textContent = data.total ? `Showing ${from}–${to} of ${data.total}` : '0 sales';
  document.getElementById('pageinfo').textContent = `Page ${data.page} of ${data.pages}`;
  prevEl.disabled = data.page <= 1;
  nextEl.disabled = data.page >= data.pages;
  for (const th of document.querySelectorAll('th[aria-sort]')) {
    const key = th.querySelector('.sort')?.dataset.sort;
    th.setAttribute('aria-sort', key === state.sort ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  }
}

async function load() {
  const mine = ++requestId; // ignore an older, slower response
  const params = new URLSearchParams({
    search: searchEl.value.trim(), status: state.status, sort: state.sort, dir: state.dir, page: String(state.page), pageSize: sizeEl.value,
  });
  try {
    const res = await fetch(`/api/sales?${params}`);
    if (mine !== requestId) return;
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { clearMsg(); emptyRow('You do not have access to the Sales list. Ask an administrator to assign a sales right.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load sales.'); return; }
    if (json.page > json.pages) { state.page = json.pages; return load(); } // page no longer exists (list shrank)
    render(json);
  } catch {
    if (mine === requestId) flash('bad', 'Could not reach the server. Please try again.');
  }
}

function reload() { clearMsg(); state.page = 1; load(); }

searchEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reload, 300); });
document.getElementById('filters').addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(timer); reload(); });
sizeEl.addEventListener('change', reload);
document.getElementById('clear').addEventListener('click', () => { searchEl.value = ''; reload(); searchEl.focus(); });
prevEl.addEventListener('click', () => { clearMsg(); state.page -= 1; load(); });
nextEl.addEventListener('click', () => { clearMsg(); state.page += 1; load(); });
for (const b of document.querySelectorAll('.sort')) {
  b.addEventListener('click', () => {
    state.dir = state.sort === b.dataset.sort && state.dir === 'asc' ? 'desc' : 'asc';
    state.sort = b.dataset.sort;
    reload();
  });
}

// ---- Status tabs: Admins only ----
const TABS = [['active', 'Active', 'active'], ['deleted', 'Inactive', 'deleted'], ['all', 'All', 'all']];
function renderTabs(counts) {
  const box = document.getElementById('status-tabs');
  box.hidden = !can.seeDeleted || !counts;
  if (box.hidden) return;
  box.replaceChildren();
  for (const [key, label, countKey] of TABS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${label} ${counts[countKey]}`;
    b.setAttribute('aria-pressed', String(state.status === key));
    b.addEventListener('click', () => { state.status = key; reload(); });
    box.append(b);
  }
}

// ---- New Sale / Edit Sale ----
function showErrors(errors = {}) {
  for (const f of FIELDS) {
    const el = form.querySelector(`[data-for="${f}"]`);
    if (el) el.textContent = errors[f] || '';
    form.elements[f].setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
  }
}

function fill(select, items, value, label) {
  select.replaceChildren();
  const first = document.createElement('option');
  first.value = '';
  first.textContent = 'Choose...';
  select.append(first);
  for (const item of items) {
    const o = document.createElement('option');
    o.value = item.value;
    o.textContent = label(item);
    select.append(o);
  }
  select.value = value || '';
}

async function loadOptions(sale) {
  const res = await fetch('/api/sales/options');
  if (res.status === 401) { window.location.href = '/login.html'; return false; }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { document.getElementById('form-error').textContent = json.error || 'Could not load the customer and salesperson lists.'; return false; }
  fill(form.elements.custno, json.customers.map((c) => ({ value: c.code, name: c.name })), sale?.custno, (c) => `${c.value} · ${c.name}`);
  fill(form.elements.empno, json.employees.map((e) => ({ value: e.empno, name: e.name, sepdate: e.sepdate })), sale?.empno,
    (e) => `${e.value} · ${e.name}${e.sepdate ? ` (left ${e.sepdate})` : ''}`);
  return true;
}

async function openDialog(sale, trigger) {
  opener = trigger;
  editing = sale || null;
  document.getElementById('sale-title').textContent = sale ? 'Edit Sale' : 'New Sale';
  form.elements.transno.value = sale ? sale.transno : '';
  form.elements.transno.placeholder = sale ? '' : 'Assigned on save';
  form.elements.salesdate.value = sale ? sale.salesdate || '' : '';
  form.elements.salesdate.max = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  showErrors();
  document.getElementById('form-error').textContent = '';
  fill(form.elements.custno, [], '', String);
  fill(form.elements.empno, [], '', String);
  dialog.showModal();
  form.elements.salesdate.focus();
  await loadOptions(sale);
}

async function submit(extra = {}) {
  showErrors();
  document.getElementById('form-error').textContent = '';
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  const body = { ...Object.fromEntries(FIELDS.map((f) => [f, form.elements[f].value])), ...extra };
  try {
    const res = await fetch(editing ? `/api/sales/${encodeURIComponent(editing.transno)}` : '/api/sales', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      dialog.close();
      flash('ok', editing ? `${json.sale.transno} was updated.` : `Sale ${json.sale.transno} was created.`);
      load();
    } else if (res.status === 409 && json.confirm) {
      askReprice(json.error); // the form stays open; nothing is saved until the person agrees
    } else if (json.errors) {
      showErrors(json.errors); // the form stays open with the entered values kept
      const first = FIELDS.find((f) => json.errors[f]);
      if (first) form.elements[first].focus();
    } else {
      document.getElementById('form-error').textContent = json.error || 'Something went wrong. Your entered values are kept. Please try again.';
    }
  } catch {
    document.getElementById('form-error').textContent = 'Could not reach the server. Your entered values are kept. Please try again.';
  } finally {
    saveBtn.disabled = false;
  }
}

form.addEventListener('submit', (ev) => { ev.preventDefault(); submit(); });

// ---- Confirm: changing the date re-prices the lines ----
const confirmDialog = document.getElementById('confirm-dialog');
function askReprice(text) {
  document.getElementById('confirm-text').textContent = text;
  confirmDialog.showModal();
  document.getElementById('confirm-cancel').focus(); // the safe choice has the focus
}
document.getElementById('confirm-cancel').addEventListener('click', () => confirmDialog.close());
document.getElementById('confirm-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  confirmDialog.close();
  submit({ confirmReprice: true });
});
confirmDialog.addEventListener('close', () => { if (dialog.open) form.elements.salesdate.focus(); });

dialog.addEventListener('close', () => {
  const again = editing && rowsEl.querySelector(`button[data-act="edit"][data-transno="${editing.transno}"]`);
  const target = opener && document.contains(opener) ? opener : again || document.getElementById('add-btn');
  target.focus();
});
document.getElementById('cancel-btn').addEventListener('click', () => dialog.close());
document.getElementById('sale-close').addEventListener('click', () => dialog.close());
document.getElementById('add-btn').addEventListener('click', (ev) => openDialog(null, ev.currentTarget));

load();
