'use strict';

// One report, drawn from what /api/reports/<slug> returns: title, columns, rows. Opened as /report.html?r=product-master.
// The server decides what is in the report and whether this person may see it. Print and Save as PDF use the browser's own
// print window, so they print exactly what is on screen. All text goes in with textContent.
const params = new URLSearchParams(window.location.search);
const slug = /^[a-z-]{1,40}$/.test(params.get('r') || '') ? params.get('r') : '';
const msg = document.getElementById('msg');
const output = document.getElementById('output');
const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const filtersForm = document.getElementById('filters');
let requestId = 0;

function flash(kind, text) { msg.className = kind; msg.textContent = text; }

function formatValue(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'money') return PESO.format(value);
  return String(value);
}

function draw(data) {
  document.title = `${data.report.title} - Hope, Inc. ERP`;
  document.getElementById('title').textContent = data.report.title;
  document.getElementById('caption').textContent = data.report.title;
  const bits = [`Hope, Inc. · As of ${data.asOf}`];
  if (data.subject) bits.push(data.subject);
  document.getElementById('subtitle').textContent = bits.join(' · ');
  const head = document.getElementById('head');
  head.replaceChildren();
  for (const c of data.columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = c.label;
    if (c.type === 'money') th.className = 'num';
    head.append(th);
  }
  const rows = document.getElementById('rows');
  rows.replaceChildren();
  if (!data.rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = data.columns.length;
    td.className = 'muted';
    td.textContent = data.prompt || 'No records to show.';
    tr.append(td);
    rows.append(tr);
  }
  for (const r of data.rows) {
    const tr = document.createElement('tr');
    for (const c of data.columns) {
      const td = document.createElement('td');
      td.textContent = formatValue(r[c.key], c.type);
      if (c.type === 'money') td.className = 'num';
      tr.append(td);
    }
    rows.append(tr);
  }
  document.getElementById('footer').textContent = `${data.count} record${data.count === 1 ? '' : 's'} · read-only output`;
  output.hidden = false;
  const printable = data.rows.length > 0;
  document.getElementById('print-btn').hidden = !printable;
  document.getElementById('pdf-btn').hidden = !printable;
}

function drawFilters(data) {
  if (!data.filters) return;
  filtersForm.hidden = false;
  const select = document.getElementById('empno');
  select.replaceChildren();
  const first = document.createElement('option');
  first.value = '';
  first.textContent = 'Choose an employee...';
  select.append(first);
  for (const e of data.filters.employees) {
    const o = document.createElement('option');
    o.value = e.empno;
    o.textContent = `${e.empno} · ${e.name}`;
    select.append(o);
  }
  select.value = data.filters.empno || '';
}

async function load() {
  if (!slug) { flash('bad', 'No report was chosen. Go back to Reports and pick one.'); return; }
  const mine = ++requestId; // ignore an older, slower answer
  const query = new URLSearchParams();
  const empno = document.getElementById('empno').value;
  if (empno) query.set('empno', empno);
  flash('', 'Loading...');
  try {
    const res = await fetch(`/api/reports/${slug}?${query}`);
    if (mine !== requestId) return;
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      output.hidden = true;
      document.getElementById('print-btn').hidden = true;
      document.getElementById('pdf-btn').hidden = true;
      flash('bad', res.status === 403 ? (json.error || 'Report access restricted. You cannot open this report with your current permissions.') : json.error || 'Could not load this report.');
      return;
    }
    msg.className = '';
    msg.textContent = '';
    if (!filtersForm.dataset.ready) { drawFilters(json); filtersForm.dataset.ready = '1'; }
    draw(json);
  } catch {
    if (mine === requestId) flash('bad', 'Could not reach the server. Please try again.');
  }
}

document.getElementById('empno').addEventListener('change', load);
filtersForm.addEventListener('submit', (e) => { e.preventDefault(); load(); });
for (const id of ['print-btn', 'pdf-btn']) document.getElementById(id).addEventListener('click', () => window.print());
document.getElementById('pdf-btn').addEventListener('click', () => { document.getElementById('pdf-hint').hidden = false; });

load();
