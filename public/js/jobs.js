'use strict';

// Jobs (S3-DEV-02): list with search, sort and paging; Add, Edit, Delete and Restore.
// The server checks every right; this file only draws what it is given.
// All text is inserted with textContent (job descriptions come from users, never innerHTML).
const rowsEl = document.getElementById('rows');
const msgEl = document.getElementById('msg');
const searchEl = document.getElementById('search');
const sizeEl = document.getElementById('pageSize');
const prevEl = document.getElementById('prev');
const nextEl = document.getElementById('next');
const state = { page: 1, sort: 'code', dir: 'asc', status: 'active' };
let can = { add: false, edit: false, delete: false, restore: false, seeDeleted: false };
let opener = null;
let editingCode = null;
let timer = null;
let requestId = 0;
const dialog = document.getElementById('job-dialog');
const form = document.getElementById('job-form');
const FIELDS = ['code', 'description'];

function flash(kind, text) { msgEl.className = kind; msgEl.textContent = text; }
function clearMsg() { msgEl.className = ''; msgEl.textContent = ''; }
function showActions() { return can.edit || can.delete || can.restore; }
function cols() { return 2 + (can.seeDeleted ? 2 : 0) + (showActions() ? 1 : 0); }

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
  document.getElementById('actions-th').hidden = !showActions();
  document.getElementById('status-th').hidden = !can.seeDeleted;
  document.getElementById('stamp-th').hidden = !can.seeDeleted;
  renderTabs(data.counts);
  const filtered = Boolean(searchEl.value.trim());
  document.getElementById('clear').hidden = !filtered;
  if (!data.jobs.length) {
    emptyRow(filtered ? 'No jobs match your search.' : 'There are no jobs yet.');
  } else {
    rowsEl.replaceChildren();
    for (const d of data.jobs) {
      const tr = document.createElement('tr');
      for (const text of [d.code, d.description]) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      if (can.seeDeleted) {
        const statusTd = document.createElement('td');
        const sb = document.createElement('span');
        sb.className = `badge${d.deleted ? ' blocked' : ''}`;
        sb.textContent = d.status;
        statusTd.append(sb);
        const stampTd = document.createElement('td');
        stampTd.textContent = d.stamp || '—';
        tr.append(statusTd, stampTd);
      }
      if (d.deleted) tr.className = 'row-deleted';
      if (showActions()) {
        const actionsTd = document.createElement('td');
        const box = document.createElement('div');
        box.className = 'actions';
        const act = (label, cls, fn) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = `btn ${cls}`.trim();
          b.textContent = label;
          b.setAttribute('aria-label', `${label} ${d.description}`);
          b.dataset.act = label.toLowerCase();
          b.dataset.code = d.code;
          b.addEventListener('click', () => fn(b));
          box.append(b);
        };
        if (d.deleted) {
          if (can.restore) act('Restore', '', (b) => restoreJob(d, b));
        } else {
          if (can.edit) act('Edit', '', (b) => openDialog(d, b));
          if (can.delete) act('Delete', 'danger', (b) => askDelete(d, b));
        }
        actionsTd.append(box);
        tr.append(actionsTd);
      }
      rowsEl.append(tr);
    }
  }
  const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(data.page * data.pageSize, data.total);
  document.getElementById('count').textContent = data.total ? `Showing ${from}–${to} of ${data.total}` : '0 jobs';
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
    search: searchEl.value.trim(), status: state.status, sort: state.sort, dir: state.dir,
    page: String(state.page), pageSize: sizeEl.value,
  });
  try {
    const res = await fetch(`/api/jobs?${params}`);
    if (mine !== requestId) return;
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { clearMsg(); emptyRow('You do not have access to Jobs. Ask an administrator to assign a job right.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load jobs.'); return; }
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

// ---- Delete (with confirmation) and Restore ----
const confirmDialog = document.getElementById('confirm-dialog');
let pendingDelete = null;
let confirmOpener = null;

function askDelete(job, trigger) {
  pendingDelete = job;
  confirmOpener = trigger;
  document.getElementById('confirm-text').textContent =
    `${job.description} (${job.code}) will be marked Inactive. An Admin can restore it later.`;
  document.getElementById('confirm-error').textContent = '';
  confirmDialog.showModal();
  document.getElementById('confirm-cancel').focus(); // the safe choice has the focus
}

document.getElementById('confirm-cancel').addEventListener('click', () => confirmDialog.close());
confirmDialog.addEventListener('close', () => {
  const again = pendingDelete && rowsEl.querySelector(`button[data-act="delete"][data-code="${pendingDelete.code}"]`);
  const target = confirmOpener && document.contains(confirmOpener) ? confirmOpener : again || searchEl;
  target.focus();
});
document.getElementById('confirm-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const okBtn = document.getElementById('confirm-ok');
  okBtn.disabled = true;
  try {
    const res = await fetch(`/api/jobs/${encodeURIComponent(pendingDelete.code)}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      confirmDialog.close();
      flash('ok', `${pendingDelete.description} was deleted.`);
      load();
    } else {
      document.getElementById('confirm-error').textContent = json.error || 'Could not delete this job.';
    }
  } catch {
    document.getElementById('confirm-error').textContent = 'Could not reach the server. Please try again.';
  } finally {
    okBtn.disabled = false;
  }
});

async function restoreJob(job, button) {
  button.disabled = true;
  try {
    const res = await fetch(`/api/jobs/${encodeURIComponent(job.code)}/restore`, { method: 'POST' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) { flash('ok', `${job.description} was restored.`); load(); } else { flash('bad', json.error || 'Could not restore this job.'); button.disabled = false; }
  } catch {
    flash('bad', 'Could not reach the server. Please try again.');
    button.disabled = false;
  }
}

// ---- Add / Edit ----
function showErrors(errors = {}) {
  for (const f of FIELDS) {
    const el = form.querySelector(`[data-for="${f}"]`);
    if (el) el.textContent = errors[f] || '';
    if (form.elements[f]) form.elements[f].setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
  }
}

function openDialog(job, trigger) {
  opener = trigger;
  editingCode = job ? job.code : null;
  document.getElementById('job-title').textContent = job ? 'Edit Job' : 'Add Job';
  form.elements.code.value = job ? job.code : '';
  form.elements.code.readOnly = Boolean(job); // the code never changes
  document.getElementById('code-hint').textContent = job
    ? 'The code cannot be changed.'
    : '2 to 4 letters or digits, for example MGR. It cannot be changed later.';
  form.elements.description.value = job ? job.description : '';
  showErrors();
  document.getElementById('form-error').textContent = '';
  dialog.showModal();
  (job ? form.elements.description : form.elements.code).focus();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showErrors();
  document.getElementById('form-error').textContent = '';
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  const body = { code: form.elements.code.value, description: form.elements.description.value };
  try {
    const res = await fetch(editingCode ? `/api/jobs/${encodeURIComponent(editingCode)}` : '/api/jobs', {
      method: editingCode ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      dialog.close();
      flash('ok', editingCode ? `${json.job.description} was updated.` : `${json.job.description} was added as ${json.job.code}.`);
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
  const again = editingCode && rowsEl.querySelector(`button[data-act="edit"][data-code="${editingCode}"]`);
  const target = opener && document.contains(opener) ? opener : again || document.getElementById('add-btn');
  target.focus();
});
document.getElementById('cancel-btn').addEventListener('click', () => dialog.close());
document.getElementById('job-close').addEventListener('click', () => dialog.close());
document.getElementById('add-btn').addEventListener('click', (e) => openDialog(null, e.currentTarget));

load();
