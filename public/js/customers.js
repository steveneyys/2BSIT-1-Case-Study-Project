'use strict';

// Customer list (S2-DEV-01): search, payment-term filter, sort and paging.
// The server checks the right to see customers; this file only draws what it is given.
// All text is inserted with textContent (customer names come from users, never innerHTML).
const rowsEl = document.getElementById('rows');
const msgEl = document.getElementById('msg');
const searchEl = document.getElementById('search');
const termEl = document.getElementById('payterm');
const sizeEl = document.getElementById('pageSize');
const prevEl = document.getElementById('prev');
const nextEl = document.getElementById('next');
const state = { page: 1, sort: 'name', dir: 'asc' };
let can = { add: false, edit: false, delete: false }; // from the server; it still checks every action
let opener = null;
const dialog = document.getElementById('customer-dialog');
const form = document.getElementById('customer-form');
const FIELDS = ['name', 'address', 'payterm'];
let editingCode = null;
let timer = null;
let requestId = 0;

const TERM_LABEL = { COD: 'COD', '30D': '30D', '45D': '45D' };

function flash(kind, text) {
  msgEl.className = kind;
  msgEl.textContent = text;
}

function cols() { return can.edit ? 5 : 4; }

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

function render(data) {
  can = data.can || can;
  document.getElementById('add-btn').hidden = !can.add;
  document.getElementById('actions-th').hidden = !can.edit;
  const filtered = Boolean(searchEl.value.trim() || termEl.value);
  document.getElementById('clear').hidden = !filtered;
  if (!data.customers.length) {
    emptyRow(filtered ? 'No customers match your search.' : 'There are no customers yet.');
  } else {
    rowsEl.replaceChildren();
    for (const c of data.customers) {
      const tr = document.createElement('tr');
      for (const text of [c.code, c.name, c.address || '—']) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      const termTd = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = TERM_LABEL[c.payterm] || c.payterm || '—';
      termTd.append(badge);
      tr.append(termTd);
      if (can.edit) {
        const actionsTd = document.createElement('td');
        const box = document.createElement('div');
        box.className = 'actions';
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn';
        edit.textContent = 'Edit';
        edit.setAttribute('aria-label', `Edit ${c.name}`);
        edit.addEventListener('click', () => openDialog(c, edit));
        box.append(edit);
        actionsTd.append(box);
        tr.append(actionsTd);
      }
      rowsEl.append(tr);
    }
  }
  const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(data.page * data.pageSize, data.total);
  document.getElementById('count').textContent = data.total ? `Showing ${from}–${to} of ${data.total}` : '0 customers';
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
    search: searchEl.value.trim(), payterm: termEl.value, sort: state.sort, dir: state.dir,
    page: String(state.page), pageSize: sizeEl.value,
  });
  try {
    const res = await fetch(`/api/customers?${params}`);
    if (mine !== requestId) return;
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { clearMsg(); emptyRow('You do not have access to Customers. Ask an administrator to assign a customer right.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load customers.'); return; }
    if (json.page > json.pages) { state.page = json.pages; return load(); } // page no longer exists (list shrank)
    render(json);
  } catch {
    if (mine === requestId) flash('bad', 'Could not reach the server. Please try again.');
  }
}

function clearMsg() { msgEl.className = ''; msgEl.textContent = ''; }
function reload() { clearMsg(); state.page = 1; load(); }

searchEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reload, 300); });
document.getElementById('filters').addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(timer); reload(); });
termEl.addEventListener('change', reload);
sizeEl.addEventListener('change', reload);
document.getElementById('clear').addEventListener('click', () => { searchEl.value = ''; termEl.value = ''; reload(); searchEl.focus(); });
prevEl.addEventListener('click', () => { clearMsg(); state.page -= 1; load(); });
nextEl.addEventListener('click', () => { clearMsg(); state.page += 1; load(); });
for (const b of document.querySelectorAll('.sort')) {
  b.addEventListener('click', () => {
    state.dir = state.sort === b.dataset.sort && state.dir === 'asc' ? 'desc' : 'asc';
    state.sort = b.dataset.sort;
    reload();
  });
}

// ---- Add / Edit (S2-DEV-02) ----
function showErrors(errors = {}) {
  for (const f of FIELDS) {
    const el = form.querySelector(`[data-for="${f}"]`);
    if (el) el.textContent = errors[f] || '';
    if (form.elements[f]) form.elements[f].setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
  }
}

function openDialog(customer, trigger) {
  opener = trigger;
  editingCode = customer ? customer.code : null;
  document.getElementById('customer-title').textContent = customer ? 'Edit Customer' : 'Add Customer';
  document.getElementById('code-wrap').hidden = !customer;
  form.elements.code.value = customer ? customer.code : '';
  form.elements.name.value = customer ? customer.name : '';
  form.elements.address.value = customer && customer.address ? customer.address : '';
  form.elements.payterm.value = customer ? customer.payterm : '';
  showErrors();
  document.getElementById('form-error').textContent = '';
  dialog.showModal();
  form.elements.name.focus();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showErrors();
  document.getElementById('form-error').textContent = '';
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  const body = { name: form.elements.name.value, address: form.elements.address.value, payterm: form.elements.payterm.value };
  try {
    const res = await fetch(editingCode ? `/api/customers/${encodeURIComponent(editingCode)}` : '/api/customers', {
      method: editingCode ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      dialog.close();
      flash('ok', editingCode ? `${json.customer.name} was updated.` : `${json.customer.name} was added as ${json.customer.code}.`);
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
document.getElementById('customer-close').addEventListener('click', () => dialog.close());
document.getElementById('add-btn').addEventListener('click', (e) => openDialog(null, e.currentTarget));

load();
