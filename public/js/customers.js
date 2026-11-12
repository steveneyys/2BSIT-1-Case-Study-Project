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
let timer = null;
let requestId = 0;

const TERM_LABEL = { COD: 'COD', '30D': '30D', '45D': '45D' };

function flash(kind, text) {
  msgEl.className = kind;
  msgEl.textContent = text;
}

function emptyRow(text) {
  rowsEl.replaceChildren();
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 4;
  td.className = 'muted';
  td.textContent = text;
  tr.append(td);
  rowsEl.append(tr);
}

function render(data) {
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
    if (res.status === 403) { msgEl.className = ''; emptyRow('You do not have access to Customers. Ask an administrator to assign a customer right.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load customers.'); return; }
    msgEl.className = '';
    msgEl.textContent = '';
    if (json.page > json.pages) { state.page = json.pages; return load(); } // page no longer exists (list shrank)
    render(json);
  } catch {
    if (mine === requestId) flash('bad', 'Could not reach the server. Please try again.');
  }
}

function reload() { state.page = 1; load(); }

searchEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reload, 300); });
document.getElementById('filters').addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(timer); reload(); });
termEl.addEventListener('change', reload);
sizeEl.addEventListener('change', reload);
document.getElementById('clear').addEventListener('click', () => { searchEl.value = ''; termEl.value = ''; reload(); searchEl.focus(); });
prevEl.addEventListener('click', () => { state.page -= 1; load(); });
nextEl.addEventListener('click', () => { state.page += 1; load(); });
for (const b of document.querySelectorAll('.sort')) {
  b.addEventListener('click', () => {
    state.dir = state.sort === b.dataset.sort && state.dir === 'asc' ? 'desc' : 'asc';
    state.sort = b.dataset.sort;
    reload();
  });
}

load();
