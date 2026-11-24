'use strict';

// Job history of one employee (S3-DEV-06): list, Add, Edit, Delete and Restore.
// The server checks every right; this file only draws what it is given. All text goes in with textContent.
// The row with the latest effective date that has started is the current job.
const empno = new URLSearchParams(window.location.search).get('empno') || '';
const rowsEl = document.getElementById('rows');
const msgEl = document.getElementById('msg');
const titleEl = document.getElementById('title');
const summaryEl = document.getElementById('summary');
const dialog = document.getElementById('history-dialog');
const form = document.getElementById('history-form');
const confirmDialog = document.getElementById('confirm-dialog');
const FIELDS = ['jobcode', 'deptcode', 'effdate', 'salary'];
const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
let can = { add: false, edit: false, delete: false, restore: false, seeDeleted: false };
let options = { jobs: [], departments: [] };
let opener = null;
let editing = null; // { jobcode, effdate } of the row being edited, or null when adding
let pendingDelete = null;
let confirmOpener = null;
let employeeName = '';

function flash(kind, text) { msgEl.className = kind; msgEl.textContent = text; }
function clearMsg() { msgEl.className = ''; msgEl.textContent = ''; }
function showActions() { return can.edit || can.delete || can.restore; }
function cols() { return 4 + (can.seeDeleted ? 2 : 0) + (showActions() ? 1 : 0); }
const keyPath = (r) => `${encodeURIComponent(empno)}/${encodeURIComponent(r.jobcode)}/${encodeURIComponent(r.effdate)}`;

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
  options = data.options || options;
  const e = data.employee;
  employeeName = [e.firstname, e.lastname].filter(Boolean).join(' ') || e.empno;
  titleEl.textContent = `Job History: ${employeeName}`;
  const bits = [`Employee ${e.empno}`, e.hiredate ? `hired ${e.hiredate}` : null, e.sepdate ? `separated ${e.sepdate}` : null, e.deleted ? 'record is deleted (Inactive)' : null];
  const cur = data.current;
  summaryEl.textContent = `${bits.filter(Boolean).join(' · ')}. Current job: ${cur ? `${cur.job}, ${cur.department} (since ${cur.effdate})` : '—'}`;
  document.getElementById('add-btn').hidden = !can.add;
  document.getElementById('actions-th').hidden = !showActions();
  document.getElementById('status-th').hidden = !can.seeDeleted;
  document.getElementById('stamp-th').hidden = !can.seeDeleted;
  if (!data.history.length) { emptyRow('No job history yet.'); return; }
  rowsEl.replaceChildren();
  for (const r of data.history) {
    const tr = document.createElement('tr');
    const dateTd = document.createElement('td');
    dateTd.textContent = r.effdate;
    if (r.current) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = 'Current';
      dateTd.append(' ', b);
    }
    tr.append(dateTd);
    for (const text of [r.job, r.department, r.salary == null ? '—' : money.format(r.salary)]) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    if (can.seeDeleted) {
      const statusTd = document.createElement('td');
      const sb = document.createElement('span');
      sb.className = `badge${r.deleted ? ' blocked' : ''}`;
      sb.textContent = r.status;
      statusTd.append(sb);
      const stampTd = document.createElement('td');
      stampTd.textContent = r.stamp || '—';
      tr.append(statusTd, stampTd);
    }
    if (r.deleted) tr.className = 'row-deleted';
    if (showActions()) {
      const actionsTd = document.createElement('td');
      const box = document.createElement('div');
      box.className = 'actions';
      const act = (label, cls, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `btn ${cls}`.trim();
        b.textContent = label;
        b.setAttribute('aria-label', `${label} ${r.job} from ${r.effdate}`);
        b.dataset.act = label.toLowerCase();
        b.dataset.jobcode = r.jobcode;
        b.dataset.effdate = r.effdate;
        b.addEventListener('click', () => fn(b));
        box.append(b);
      };
      if (r.deleted) {
        if (can.restore) act('Restore', '', (b) => restoreRecord(r, b));
      } else {
        if (can.edit) act('Edit', '', (b) => openDialog(r, b));
        if (can.delete) act('Delete', 'danger', (b) => askDelete(r, b));
      }
      actionsTd.append(box);
      tr.append(actionsTd);
    }
    rowsEl.append(tr);
  }
}

async function load() {
  if (!/^\d{5}$/.test(empno)) { emptyRow('No employee was chosen. Go back to Employees and click History.'); return; }
  try {
    const res = await fetch(`/api/job-history/${encodeURIComponent(empno)}`);
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { titleEl.textContent = 'Job History'; emptyRow('You do not have the right to view job history. Ask an administrator for the View Job History right.'); return; }
    if (res.status === 404) { titleEl.textContent = 'Job History'; emptyRow(json.error || 'Employee not found.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load the job history.'); return; }
    render(json);
  } catch {
    flash('bad', 'Could not reach the server. Please try again.');
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

function fillSelect(select, items, label, value) {
  select.replaceChildren();
  const first = document.createElement('option');
  first.value = '';
  first.textContent = 'Choose...';
  select.append(first);
  for (const it of items) {
    const o = document.createElement('option');
    o.value = it.code;
    o.textContent = `${label(it)} (${it.code})`;
    select.append(o);
  }
  select.value = value || '';
}

function openDialog(row, trigger) {
  opener = trigger;
  editing = row ? { jobcode: row.jobcode, effdate: row.effdate } : null;
  document.getElementById('history-title').textContent = row ? 'Edit Job History' : 'Add Job History';
  fillSelect(form.elements.jobcode, options.jobs, (j) => j.description, row && row.jobcode);
  fillSelect(form.elements.deptcode, options.departments, (d) => d.name, row && row.deptcode);
  form.elements.effdate.value = row ? row.effdate : '';
  form.elements.salary.value = row && row.salary != null ? row.salary.toFixed(2) : '';
  showErrors();
  document.getElementById('form-error').textContent = '';
  dialog.showModal();
  form.elements.jobcode.focus();
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  showErrors();
  document.getElementById('form-error').textContent = '';
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  const body = Object.fromEntries(FIELDS.map((f) => [f, form.elements[f].value]));
  try {
    const url = editing ? `/api/job-history/${keyPath(editing)}` : `/api/job-history/${encodeURIComponent(empno)}`;
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      dialog.close();
      flash('ok', editing ? 'The job history record was updated.' : 'The job history record was added.');
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
  const again = editing && rowsEl.querySelector(`button[data-act="edit"][data-jobcode="${editing.jobcode}"][data-effdate="${editing.effdate}"]`);
  const target = opener && document.contains(opener) ? opener : again || document.getElementById('add-btn');
  target.focus();
});
document.getElementById('cancel-btn').addEventListener('click', () => dialog.close());
document.getElementById('history-close').addEventListener('click', () => dialog.close());
document.getElementById('add-btn').addEventListener('click', (ev) => openDialog(null, ev.currentTarget));

// ---- Delete (with confirmation) and Restore ----
function askDelete(row, trigger) {
  pendingDelete = row;
  confirmOpener = trigger;
  document.getElementById('confirm-text').textContent =
    `${row.job} from ${row.effdate} will be marked Inactive and no longer counts as a job. An Admin can restore it later.`;
  document.getElementById('confirm-error').textContent = '';
  confirmDialog.showModal();
  document.getElementById('confirm-cancel').focus(); // the safe choice has the focus
}

document.getElementById('confirm-cancel').addEventListener('click', () => confirmDialog.close());
confirmDialog.addEventListener('close', () => {
  const target = confirmOpener && document.contains(confirmOpener) ? confirmOpener : document.getElementById('add-btn');
  target.focus();
});
document.getElementById('confirm-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const okBtn = document.getElementById('confirm-ok');
  okBtn.disabled = true;
  try {
    const res = await fetch(`/api/job-history/${keyPath(pendingDelete)}`, { method: 'DELETE' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) { confirmDialog.close(); flash('ok', 'The job history record was deleted.'); load(); } else {
      document.getElementById('confirm-error').textContent = json.error || 'Could not delete this record.';
    }
  } catch {
    document.getElementById('confirm-error').textContent = 'Could not reach the server. Please try again.';
  } finally {
    okBtn.disabled = false;
  }
});

async function restoreRecord(row, button) {
  button.disabled = true;
  try {
    const res = await fetch(`/api/job-history/${keyPath(row)}/restore`, { method: 'POST' });
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.ok) { flash('ok', 'The job history record was restored.'); load(); } else { flash('bad', json.error || 'Could not restore this record.'); button.disabled = false; }
  } catch {
    flash('bad', 'Could not reach the server. Please try again.');
    button.disabled = false;
  }
}

load();
