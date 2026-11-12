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
const state = { page: 1, sort: 'description', dir: 'asc' };
let timer = null;
let requestId = 0;

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const dateFmt = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

function flash(kind, text) { msgEl.className = kind; msgEl.textContent = text; }
function clearMsg() { msgEl.className = ''; msgEl.textContent = ''; }

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
    search: searchEl.value.trim(), unit: unitEl.value, sort: state.sort, dir: state.dir,
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

load();
