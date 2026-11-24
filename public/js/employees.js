'use strict';

// Employees (S3-DEV-03 list, S3-DEV-04 Add and Edit, S3-DEV-05 Delete and Restore).
// The server checks every right; this file only draws what it is given. All text goes in with textContent.
// Salary and job history are never in this list (View Job History right, S3-DEV-08).
const rowsEl = document.getElementById('rows');
const msgEl = document.getElementById('msg');
const searchEl = document.getElementById('search');
const genderEl = document.getElementById('gender');
const employmentEl = document.getElementById('employment');
const sizeEl = document.getElementById('pageSize');
const prevEl = document.getElementById('prev');
const nextEl = document.getElementById('next');
const state = { page: 1, sort: 'empno', dir: 'asc', status: 'active' };
let can = { add: false, edit: false, delete: false, restore: false, seeDeleted: false, history: false };
let opener = null;
let editingEmpno = null;
let timer = null;
let requestId = 0;

function flash(kind, text) { msgEl.className = kind; msgEl.textContent = text; }
function clearMsg() { msgEl.className = ''; msgEl.textContent = ''; }
function showActions() { return can.history || can.edit || can.delete || can.restore; }
const FIELDS = ['empno', 'lastname', 'firstname', 'gender', 'birthdate', 'hiredate', 'sepdate'];
const dialog = document.getElementById('employee-dialog');
const form = document.getElementById('employee-form');
function cols() { return 6 + (can.seeDeleted ? 2 : 0) + (showActions() ? 1 : 0); }
function filtered() { return Boolean(searchEl.value.trim() || genderEl.value || employmentEl.value); }
const GENDER = { M: 'Male', F: 'Female' };

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
  document.getElementById('clear').hidden = !filtered();
  if (!data.employees.length) {
    emptyRow(filtered() ? 'No employees match your search.' : 'There are no employees yet.');
  } else {
    rowsEl.replaceChildren();
    for (const e of data.employees) {
      const tr = document.createElement('tr');
      const name = [e.lastname, e.firstname].filter(Boolean).join(', ');
      for (const text of [e.empno, name, GENDER[e.gender] || '—', e.birthdate || '—', e.hiredate || '—', e.sepdate || '—']) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      if (can.seeDeleted) {
        const statusTd = document.createElement('td');
        const sb = document.createElement('span');
        sb.className = `badge${e.deleted ? ' blocked' : ''}`;
        sb.textContent = e.status;
        statusTd.append(sb);
        const stampTd = document.createElement('td');
        stampTd.textContent = e.stamp || '—';
        tr.append(statusTd, stampTd);
      }
      if (e.deleted) tr.className = 'row-deleted';
      if (showActions()) {
        const actionsTd = document.createElement('td');
        const box = document.createElement('div');
        box.className = 'actions';
        if (can.history) {
          // Opens the job history screen (S3-DEV-06); the server re-checks the View Job History right.
          const a = document.createElement('a');
          a.className = 'btn';
          a.href = `/job-history.html?empno=${encodeURIComponent(e.empno)}`;
          a.textContent = 'History';
          a.setAttribute('aria-label', `History for ${name || e.empno}`);
          a.dataset.act = 'history';
          a.dataset.empno = e.empno;
          box.append(a);
        }
        if (can.edit && !e.deleted) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn';
          b.textContent = 'Edit';
          b.setAttribute('aria-label', `Edit ${name || e.empno}`);
          b.dataset.act = 'edit';
          b.dataset.empno = e.empno;
          b.addEventListener('click', () => openDialog(e, b));
          box.append(b);
        }
        const act = (label, cls, fn) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = `btn ${cls}`.trim();
          b.textContent = label;
          b.setAttribute('aria-label', `${label} ${name || e.empno}`);
          b.dataset.act = label.toLowerCase();
          b.dataset.empno = e.empno;
          b.addEventListener('click', () => fn(b));
          box.append(b);
        };
        if (e.deleted) {
          if (can.restore) act('Restore', '', (b) => restoreEmployee(e, b));
        } else if (can.delete) {
          act('Delete', 'danger', (b) => askDelete(e, b));
        }
        actionsTd.append(box);
        tr.append(actionsTd);
      }
      rowsEl.append(tr);
    }
  }
  const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(data.page * data.pageSize, data.total);
  document.getElementById('count').textContent = data.total ? `Showing ${from}–${to} of ${data.total}` : '0 employees';
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
    search: searchEl.value.trim(), gender: genderEl.value, employment: employmentEl.value, status: state.status,
    sort: state.sort, dir: state.dir, page: String(state.page), pageSize: sizeEl.value,
  });
  try {
    const res = await fetch(`/api/employees?${params}`);
    if (mine !== requestId) return;
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { clearMsg(); emptyRow('You do not have access to Employees. Ask an administrator to assign an employee right.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load employees.'); return; }
    if (json.page > json.pages) { state.page = json.pages; return load(); } // page no longer exists (list shrank)
    render(json);
  } catch {
    if (mine === requestId) flash('bad', 'Could not reach the server. Please try again.');
  }
}

function reload() { clearMsg(); state.page = 1; load(); }

searchEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(reload, 300); });
document.getElementById('filters').addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(timer); reload(); });
genderEl.addEventListener('change', reload);
employmentEl.addEventListener('change', reload);
sizeEl.addEventListener('change', reload);
document.getElementById('clear').addEventListener('click', () => {
  searchEl.value = ''; genderEl.value = ''; employmentEl.value = '';
  reload(); searchEl.focus();
});
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
const nameOf = (e) => [e.firstname, e.lastname].filter(Boolean).join(' ') || e.empno;

function askDelete(emp, trigger) {
  pendingDelete = emp;
  confirmOpener = trigger;
  document.getElementById('confirm-text').textContent =
    `${nameOf(emp)} (${emp.empno}) will be marked Inactive. Their separation date is not changed. An Admin can restore the record later.`;
  document.getElementById('confirm-error').textContent = '';
  confirmDialog.showModal();
  document.getElementById('confirm-cancel').focus(); // the safe choice has the focus
}

document.getElementById('confirm-cancel').addEventListener('click', () => confirmDialog.close());
confirmDialog.addEventListener('close', () => {
  const again = pendingDelete && rowsEl.querySelector(`button[data-act="delete"][data-empno="${pendingDelete.empno}"]`);
  const target = confirmOpener && document.contains(confirmOpener) ? confirmOpener : again || searchEl;
  target.focus();
});
document.getElementById('confirm-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const okBtn = document.getElementById('confirm-ok');
  okBtn.disabled = true;
  try {
    const res = await fetch(`/api/employees/${encodeURIComponent(pendingDelete.empno)}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      confirmDialog.close();
      flash('ok', `${nameOf(pendingDelete)} was deleted.`);
      load();
    } else {
      document.getElementById('confirm-error').textContent = json.error || 'Could not delete this employee.';
    }
  } catch {
    document.getElementById('confirm-error').textContent = 'Could not reach the server. Please try again.';
  } finally {
    okBtn.disabled = false;
  }
});

async function restoreEmployee(emp, button) {
  button.disabled = true;
  try {
    const res = await fetch(`/api/employees/${encodeURIComponent(emp.empno)}/restore`, { method: 'POST' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) { flash('ok', `${nameOf(emp)} was restored.`); load(); } else { flash('bad', json.error || 'Could not restore this employee.'); button.disabled = false; }
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

function openDialog(emp, trigger) {
  opener = trigger;
  editingEmpno = emp ? emp.empno : null;
  document.getElementById('employee-title').textContent = emp ? 'Edit Employee' : 'Add Employee';
  for (const f of FIELDS) form.elements[f].value = emp ? (emp[f] ?? '') : '';
  form.elements.empno.readOnly = Boolean(emp); // the number never changes
  document.getElementById('empno-hint').textContent = emp
    ? 'The employee number cannot be changed.'
    : 'Exactly 5 digits, for example 00015. It cannot be changed later.';
  showErrors();
  document.getElementById('form-error').textContent = '';
  dialog.showModal();
  (emp ? form.elements.lastname : form.elements.empno).focus();
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  showErrors();
  document.getElementById('form-error').textContent = '';
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  const body = Object.fromEntries(FIELDS.map((f) => [f, form.elements[f].value]));
  try {
    const res = await fetch(editingEmpno ? `/api/employees/${encodeURIComponent(editingEmpno)}` : '/api/employees', {
      method: editingEmpno ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      dialog.close();
      const who = `${json.employee.firstname} ${json.employee.lastname}`;
      flash('ok', editingEmpno ? `${who} was updated.` : `${who} was added as ${json.employee.empno}.`);
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
  const again = editingEmpno && rowsEl.querySelector(`button[data-act="edit"][data-empno="${editingEmpno}"]`);
  const target = opener && document.contains(opener) ? opener : again || document.getElementById('add-btn');
  target.focus();
});
document.getElementById('cancel-btn').addEventListener('click', () => dialog.close());
document.getElementById('employee-close').addEventListener('click', () => dialog.close());
document.getElementById('add-btn').addEventListener('click', (ev) => openDialog(null, ev.currentTarget));

load();
