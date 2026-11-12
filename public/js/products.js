'use strict';

// Product list (S2-DEV-04): search, unit filter, sort and paging, with each product's current price.
// The server checks the right to see products; this file only draws what it is given.
// All text is inserted with textContent (descriptions come from users, never innerHTML).
const rowsEl = document.getElementById('rows');
const msgEl = document.getElementById('msg');
const searchEl = document.getElementById('search');
const unitEl = document.getElementById('unit');
const sizeEl = document.getElementById('pageSize');
const prevEl = document.getElementById('prev');
const nextEl = document.getElementById('next');
const state = { page: 1, status: 'active', sort: 'description', dir: 'asc' };
let can = { add: false, edit: false, delete: false, restore: false, seeDeleted: false }; // from the server; it still checks every action
let opener = null;
let editingCode = null;
const dialog = document.getElementById('product-dialog');
const form = document.getElementById('product-form');
const FIELDS = ['code', 'description', 'unit'];
let timer = null;
let requestId = 0;

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const dateFmt = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

function flash(kind, text) { msgEl.className = kind; msgEl.textContent = text; }
function clearMsg() { msgEl.className = ''; msgEl.textContent = ''; }

function showActions() { return can.edit || can.delete || can.restore; }
function cols() { return 4 + (can.seeDeleted ? 2 : 0) + (showActions() ? 1 : 0); }

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

function priceCell(p) {
  const td = document.createElement('td');
  td.className = 'num';
  if (p.price === null) {
    td.textContent = '—';
    td.title = 'No price yet';
    return td;
  }
  td.textContent = money.format(p.price);
  // priceDate is a plain YYYY-MM-DD string: shown in UTC so the day never shifts.
  if (p.priceDate) td.title = `Effective ${dateFmt.format(new Date(`${p.priceDate}T00:00:00Z`))}`;
  return td;
}

function render(data) {
  can = data.can || can;
  document.getElementById('add-btn').hidden = !can.add;
  document.getElementById('actions-th').hidden = !showActions();
  document.getElementById('status-th').hidden = !can.seeDeleted;
  document.getElementById('stamp-th').hidden = !can.seeDeleted;
  renderTabs(data.counts);
  const filtered = Boolean(searchEl.value.trim() || unitEl.value);
  document.getElementById('clear').hidden = !filtered;
  if (!data.products.length) {
    emptyRow(filtered ? 'No products match your search.' : 'There are no products yet.');
  } else {
    rowsEl.replaceChildren();
    for (const p of data.products) {
      const tr = document.createElement('tr');
      for (const text of [p.code, p.description || '—']) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      const unitTd = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = p.unit || '—';
      unitTd.append(badge);
      tr.append(unitTd, priceCell(p));
      if (can.seeDeleted) {
        const statusTd = document.createElement('td');
        const sb = document.createElement('span');
        sb.className = `badge${p.deleted ? ' blocked' : ''}`;
        sb.textContent = p.status;
        statusTd.append(sb);
        const stampTd = document.createElement('td');
        stampTd.textContent = p.stamp || '\u2014';
        tr.append(statusTd, stampTd);
      }
      if (p.deleted) tr.className = 'row-deleted';
      if (showActions()) {
        const actionsTd = document.createElement('td');
        const box = document.createElement('div');
        box.className = 'actions';
        const act = (label, cls, fn) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = `btn ${cls}`.trim();
          b.textContent = label;
          b.setAttribute('aria-label', `${label} ${p.description || p.code}`);
          b.addEventListener('click', () => fn(b));
          box.append(b);
        };
        if (p.deleted) {
          if (can.restore) act('Restore', '', (b) => restoreProduct(p, b));
        } else {
          if (can.edit) act('Edit', '', (b) => openDialog(p, b));
          if (can.delete) act('Delete', 'danger', (b) => askDelete(p, b));
        }
        actionsTd.append(box);
        tr.append(actionsTd);
      }
      rowsEl.append(tr);
    }
  }
  const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(data.page * data.pageSize, data.total);
  document.getElementById('count').textContent = data.total ? `Showing ${from}–${to} of ${data.total}` : '0 products';
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
    search: searchEl.value.trim(), unit: unitEl.value, status: state.status, sort: state.sort, dir: state.dir,
    page: String(state.page), pageSize: sizeEl.value,
  });
  try {
    const res = await fetch(`/api/products?${params}`);
    if (mine !== requestId) return;
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { clearMsg(); emptyRow('You do not have access to Products. Ask an administrator to assign a product right.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load products.'); return; }
    if (json.page > json.pages) { state.page = json.pages; return load(); } // the list shrank
    render(json);
  } catch {
    if (mine === requestId) flash('bad', 'Could not reach the server. Please try again.');
  }
}

function reload() { clearMsg(); state.page = 1; load(); }

searchEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reload, 300); });
document.getElementById('filters').addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(timer); reload(); });
unitEl.addEventListener('change', reload);
sizeEl.addEventListener('change', reload);
document.getElementById('clear').addEventListener('click', () => { searchEl.value = ''; unitEl.value = ''; reload(); searchEl.focus(); });
prevEl.addEventListener('click', () => { clearMsg(); state.page -= 1; load(); });
nextEl.addEventListener('click', () => { clearMsg(); state.page += 1; load(); });
for (const b of document.querySelectorAll('.sort')) {
  b.addEventListener('click', () => {
    state.dir = state.sort === b.dataset.sort && state.dir === 'asc' ? 'desc' : 'asc';
    state.sort = b.dataset.sort;
    reload();
  });
}

// ---- Status tabs: Admins only (S2-DEV-06) ----
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

// ---- Delete (with confirmation) and Restore ----
const confirmDialog = document.getElementById('confirm-dialog');
let pendingDelete = null;
let confirmOpener = null;

function askDelete(product, trigger) {
  pendingDelete = product;
  confirmOpener = trigger;
  document.getElementById('confirm-text').textContent =
    `${product.description} (${product.code}) will be marked Inactive. An Admin can restore it later.`;
  document.getElementById('confirm-error').textContent = '';
  confirmDialog.showModal();
  document.getElementById('confirm-cancel').focus(); // the safe choice has the focus
}

document.getElementById('confirm-cancel').addEventListener('click', () => confirmDialog.close());
confirmDialog.addEventListener('close', () => {
  const target = confirmOpener && document.contains(confirmOpener) ? confirmOpener : searchEl;
  target.focus();
});
document.getElementById('confirm-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const okBtn = document.getElementById('confirm-ok');
  okBtn.disabled = true;
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(pendingDelete.code)}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      confirmDialog.close();
      flash('ok', `${pendingDelete.description} was deleted.`);
      load();
    } else {
      document.getElementById('confirm-error').textContent = json.error || 'Could not delete this product.';
    }
  } catch {
    document.getElementById('confirm-error').textContent = 'Could not reach the server. Please try again.';
  } finally {
    okBtn.disabled = false;
  }
});

async function restoreProduct(product, button) {
  button.disabled = true;
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(product.code)}/restore`, { method: 'POST' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) { flash('ok', `${product.description} was restored.`); load(); } else { flash('bad', json.error || 'Could not restore this product.'); button.disabled = false; }
  } catch {
    flash('bad', 'Could not reach the server. Please try again.');
    button.disabled = false;
  }
}

// ---- Add / Edit (S2-DEV-05) ----
function showErrors(errors = {}) {
  for (const f of FIELDS) {
    const el = form.querySelector(`[data-for="${f}"]`);
    if (el) el.textContent = errors[f] || '';
    if (form.elements[f]) form.elements[f].setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
  }
}

function openDialog(product, trigger) {
  opener = trigger;
  editingCode = product ? product.code : null;
  document.getElementById('product-title').textContent = product ? 'Edit Product' : 'Add Product';
  form.elements.code.value = product ? product.code : '';
  form.elements.code.readOnly = Boolean(product); // the code never changes
  document.getElementById('code-hint').textContent = product
    ? 'The code cannot be changed.'
    : 'Two letters and four digits, for example AD0001. It cannot be changed later.';
  form.elements.description.value = product ? product.description : '';
  form.elements.unit.value = product ? product.unit : '';
  showErrors();
  document.getElementById('form-error').textContent = '';
  dialog.showModal();
  (product ? form.elements.description : form.elements.code).focus();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showErrors();
  document.getElementById('form-error').textContent = '';
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  const body = { code: form.elements.code.value, description: form.elements.description.value, unit: form.elements.unit.value };
  try {
    const res = await fetch(editingCode ? `/api/products/${encodeURIComponent(editingCode)}` : '/api/products', {
      method: editingCode ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      dialog.close();
      flash('ok', editingCode ? `${json.product.description} was updated.` : `${json.product.description} was added as ${json.product.code}.`);
      load();
    } else if (json.errors) {
      showErrors(json.errors); // the form stays open with the problem shown
      const first = FIELDS.find((f) => json.errors[f]);
      if (first) form.elements[first].focus();
    } else {
      document.getElementById('form-error').textContent = json.error || 'Something went wrong. Please try again.';
    }
  } catch {
    document.getElementById('form-error').textContent = 'Could not reach the server. Please try again.';
  } finally {
    saveBtn.disabled = false;
  }
});

dialog.addEventListener('close', () => {
  const target = opener && document.contains(opener) ? opener : document.getElementById('add-btn');
  target.focus();
});
document.getElementById('cancel-btn').addEventListener('click', () => dialog.close());
document.getElementById('product-close').addEventListener('click', () => dialog.close());
document.getElementById('add-btn').addEventListener('click', (e) => openDialog(null, e.currentTarget));

load();
