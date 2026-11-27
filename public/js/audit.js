'use strict';

// Superadmin audit viewer (S4-DEV-08). The server enforces the Superadmin role and removes sensitive fields;
// this file only draws what it is given. All text goes in with textContent.
const rowsEl = document.getElementById('rows');
const msgEl = document.getElementById('msg');
const form = document.getElementById('filters');
const sizeEl = document.getElementById('pageSize');
const prevEl = document.getElementById('prev');
const nextEl = document.getElementById('next');
const FIELDS = ['from', 'to', 'actor', 'module', 'action', 'ref'];
const state = { page: 1 };
let requestId = 0;

function flash(kind, text) { msgEl.className = kind; msgEl.textContent = text; }
function clearMsg() { msgEl.className = ''; msgEl.textContent = ''; }
function fieldErrors(errors = {}) {
  for (const f of FIELDS) {
    const el = form.querySelector(`.err[data-for="${f}"]`);
    if (el) el.textContent = errors[f] || '';
    document.getElementById(f).toggleAttribute('aria-invalid', Boolean(errors[f]));
  }
}

function emptyRow(text) {
  rowsEl.replaceChildren();
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 6;
  td.className = 'muted';
  td.textContent = text;
  tr.append(td);
  rowsEl.append(tr);
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

// The fields that changed, as a small table: field, previous value, new value.
function changesTable(changes) {
  const t = document.createElement('table');
  t.className = 'changes';
  const head = document.createElement('tr');
  for (const h of ['Field changed', 'Previous value', 'New value']) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    head.append(th);
  }
  t.append(head);
  for (const c of changes) {
    const tr = document.createElement('tr');
    const val = (v) => cell(c.redacted ? 'Hidden' : v === null || v === undefined ? '—' : v);
    tr.append(cell(c.field), c.redacted ? cell('Hidden') : val(c.old), c.redacted ? cell('Hidden') : val(c.new));
    t.append(tr);
  }
  return t;
}

function eventRow(e) {
  const tr = document.createElement('tr');
  const who = e.actor.name ? `${e.actor.name} (${e.actor.id})${e.actor.role ? `, ${e.actor.role.charAt(0).toUpperCase()}${e.actor.role.slice(1)}` : ''}` : e.actor.id;
  tr.append(cell(e.at), cell(who), cell(e.module), cell(e.actionLabel), cell(e.target));
  const td = document.createElement('td');
  if (!e.changes.length) {
    td.className = 'muted';
    td.textContent = 'No field changes';
  } else {
    const d = document.createElement('details');
    const s = document.createElement('summary');
    s.textContent = `${e.changes.length} field${e.changes.length === 1 ? '' : 's'}`;
    s.setAttribute('aria-label', `Show ${e.changes.length} changed field${e.changes.length === 1 ? '' : 's'} of ${e.module} ${e.target}`);
    d.append(s, changesTable(e.changes));
    td.append(d);
  }
  tr.append(td);
  return tr;
}

function render(data) {
  clearMsg();
  if (!data.events.length) {
    emptyRow('No audit events found. No events match the selected filters. Adjust the date range, actor, module or record reference.');
  } else {
    rowsEl.replaceChildren(...data.events.map(eventRow));
  }
  document.getElementById('count').textContent = data.total ? `${data.total} event${data.total === 1 ? '' : 's'}` : '';
  document.getElementById('pageinfo').textContent = `Page ${data.page} of ${data.pages}`;
  prevEl.disabled = data.page <= 1;
  nextEl.disabled = data.page >= data.pages;
}

function params() {
  const p = new URLSearchParams({ page: String(state.page), pageSize: sizeEl.value });
  for (const f of FIELDS) {
    const v = document.getElementById(f).value.trim();
    if (v) p.set(f, v);
  }
  return p;
}

async function load() {
  const mine = ++requestId;
  try {
    const res = await fetch(`/api/audit?${params()}`);
    if (mine !== requestId) return; // a newer request replaced this one
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { emptyRow(''); flash('bad', 'Audit viewer is restricted to Superadmin. Your account cannot open full audit events.'); return; }
    if (res.status === 400) { fieldErrors(json.errors); flash('bad', 'Check the filters and try again.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load the audit events.'); return; }
    fieldErrors();
    render(json);
  } catch {
    if (mine === requestId) flash('bad', 'Could not reach the server. Please try again.');
  }
}

async function loadOptions() {
  const res = await fetch('/api/audit/options');
  if (res.status === 401) { window.location.href = '/login.html'; return; }
  if (!res.ok) return;
  const o = await res.json();
  const fill = (id, items) => {
    const sel = document.getElementById(id);
    for (const it of items) {
      const opt = document.createElement('option');
      opt.value = it.key ?? it;
      opt.textContent = it.label ?? it;
      sel.append(opt);
    }
  };
  fill('actor', o.actors);
  fill('module', o.modules);
  fill('action', o.actions);
}

form.addEventListener('submit', (e) => { e.preventDefault(); state.page = 1; load(); });
document.getElementById('reset-btn').addEventListener('click', () => { form.reset(); fieldErrors(); state.page = 1; load(); });
sizeEl.addEventListener('change', () => { state.page = 1; load(); });
prevEl.addEventListener('click', () => { if (state.page > 1) { state.page -= 1; load(); } });
nextEl.addEventListener('click', () => { state.page += 1; load(); });

loadOptions();
load();
