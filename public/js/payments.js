'use strict';

// Payments list and the Record Payment form (S4-DEV-03).
// The server checks every right and works out every balance; this file only draws what it is given.
// All text goes in with textContent.
const rowsEl = document.getElementById('rows');
const msgEl = document.getElementById('msg');
const searchEl = document.getElementById('search');
const sizeEl = document.getElementById('pageSize');
const prevEl = document.getElementById('prev');
const nextEl = document.getElementById('next');
const state = { page: 1, sort: 'orno', dir: 'desc', status: 'active' };
let can = { record: false, seeDeleted: false };
let timer = null;
let findTimer = null;
let requestId = 0;
let optionsId = 0;
let balances = new Map();
let opener = null;

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const FIELDS = ['orno', 'paydate', 'transno', 'amount'];
const dialog = document.getElementById('payment-dialog');
const form = document.getElementById('payment-form');

function flash(kind, text) { msgEl.className = kind; msgEl.textContent = text; }
function clearMsg() { msgEl.className = ''; msgEl.textContent = ''; }
function cols() { return 4 + (can.seeDeleted ? 2 : 0); }
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
  document.getElementById('add-btn').hidden = !can.record;
  document.getElementById('no-record').hidden = can.record;
  document.getElementById('status-th').hidden = !can.seeDeleted;
  document.getElementById('stamp-th').hidden = !can.seeDeleted;
  renderTabs(data.counts);
  document.getElementById('clear').hidden = !filtered();
  if (!data.payments.length) {
    emptyRow(filtered() ? 'No payments match your search.' : 'No payments found.');
  } else {
    rowsEl.replaceChildren();
    for (const p of data.payments) {
      const tr = document.createElement('tr');
      const saleTd = document.createElement('td');
      if (p.transno) { // the linked sale opens its balance
        const a = document.createElement('a');
        a.href = `/balance.html?transno=${encodeURIComponent(p.transno)}`;
        a.textContent = p.customer ? `${p.transno} · ${p.customer}` : p.transno;
        saleTd.append(a);
      } else saleTd.textContent = '—';
      tr.append(cell(p.orno), cell(p.paydate || '—'), saleTd, cell(p.amount == null ? '—' : PESO.format(p.amount), 'num'));
      if (can.seeDeleted) {
        const statusTd = document.createElement('td');
        const sb = document.createElement('span');
        sb.className = `badge${p.deleted ? ' blocked' : ''}`;
        sb.textContent = p.status;
        statusTd.append(sb);
        tr.append(statusTd, cell(p.stamp || '—'));
      }
      if (p.deleted) tr.className = 'row-deleted';
      rowsEl.append(tr);
    }
  }
  const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(data.page * data.pageSize, data.total);
  document.getElementById('count').textContent = data.total ? `Showing ${from}–${to} of ${data.total}` : '0 payments';
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
    const res = await fetch(`/api/payments?${params}`);
    if (mine !== requestId) return;
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { clearMsg(); emptyRow('You do not have access to Payments. Ask an administrator to assign a sales right.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load payments.'); return; }
    if (json.page > json.pages) { state.page = json.pages; return load(); }
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

// ---- Record Payment ----
function showErrors(errors = {}) {
  for (const f of FIELDS) {
    const el = form.querySelector(`[data-for="${f}"]`);
    if (el) el.textContent = errors[f] || '';
    form.elements[f].setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
  }
}

function fillSales(sales, keep) {
  const select = form.elements.transno;
  select.replaceChildren();
  const first = document.createElement('option');
  first.value = '';
  first.textContent = sales.length ? 'Choose...' : 'No sale with a balance found';
  select.append(first);
  balances = new Map();
  for (const s of sales) {
    balances.set(s.transno, s);
    const o = document.createElement('option');
    o.value = s.transno;
    o.textContent = `${s.transno} · ${s.customer || s.custno} — balance ${PESO.format(s.balance)}`;
    select.append(o);
  }
  select.value = keep && balances.has(keep) ? keep : '';
  showBalance();
}

function showBalance() {
  const s = balances.get(form.elements.transno.value);
  document.getElementById('amount-hint').textContent = s
    ? `Sale total ${PESO.format(s.total)}, paid ${PESO.format(s.paid)}. The balance is ${PESO.format(s.balance)}.`
    : 'Up to the balance of the chosen sale.';
}

async function loadOptions(search = '') {
  const mine = ++optionsId; // ignore an older, slower answer
  const res = await fetch(`/api/payments/options?${new URLSearchParams({ search })}`);
  if (mine !== optionsId) return null;
  if (res.status === 401) { window.location.href = '/login.html'; return null; }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { document.getElementById('form-error').textContent = json.error || 'Could not load the sales list.'; return null; }
  fillSales(json.sales, form.elements.transno.value);
  return json;
}

async function openDialog(trigger) {
  opener = trigger;
  showErrors();
  document.getElementById('form-error').textContent = '';
  form.elements.orno.value = '';
  form.elements.amount.value = '';
  form.elements.paydate.value = '';
  document.getElementById('find-sale').value = '';
  fillSales([], '');
  dialog.showModal();
  form.elements.orno.focus();
  try {
    const json = await loadOptions();
    if (json) {
      if (!form.elements.orno.value) form.elements.orno.value = json.orno || '';
      if (!form.elements.paydate.value) form.elements.paydate.value = json.today || '';
      form.elements.paydate.max = json.today || '';
    }
  } catch {
    document.getElementById('form-error').textContent = 'Could not reach the server. Please try again.';
  }
}

form.elements.transno.addEventListener('change', showBalance);
document.getElementById('find-sale').addEventListener('input', (ev) => {
  clearTimeout(findTimer);
  findTimer = setTimeout(() => loadOptions(ev.target.value.trim()).catch(() => {}), 300);
});

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  showErrors();
  document.getElementById('form-error').textContent = '';
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  const body = Object.fromEntries(FIELDS.map((f) => [f, form.elements[f].value]));
  try {
    const res = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      dialog.close();
      flash('ok', `Payment ${json.payment.orno} of ${PESO.format(json.payment.amount)} was recorded for ${json.payment.transno}. Balance left: ${PESO.format(json.balance)}.`);
      load();
    } else if (json.errors) {
      showErrors(json.errors); // the form stays open and the entered values are kept
      const first = FIELDS.find((f) => json.errors[f]);
      if (first) form.elements[first].focus();
    } else {
      document.getElementById('form-error').textContent = json.error || 'Could not record the payment. Your entered values are kept. Please try again.';
    }
  } catch {
    document.getElementById('form-error').textContent = 'Could not reach the server. Your entered values are kept. Please try again.';
  } finally {
    saveBtn.disabled = false;
  }
});

dialog.addEventListener('close', () => { (opener && document.contains(opener) ? opener : document.getElementById('add-btn')).focus(); });
document.getElementById('cancel-btn').addEventListener('click', () => dialog.close());
document.getElementById('payment-close').addEventListener('click', () => dialog.close());
document.getElementById('add-btn').addEventListener('click', (ev) => openDialog(ev.currentTarget));

load();
