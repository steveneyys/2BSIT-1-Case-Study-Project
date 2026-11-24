'use strict';

// Employee profile (S3-DEV-07): personal details, plus the job timeline and salaries ONLY when the server sent them
// (the View Job History right). All text goes in with textContent.
const empno = new URLSearchParams(window.location.search).get('empno') || '';
const msgEl = document.getElementById('msg');
const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const GENDER = { M: 'Male', F: 'Female' };

function flash(kind, text) { msgEl.className = kind; msgEl.textContent = text; }
function show(id, on) { document.getElementById(id).hidden = !on; }

function field(grid, label, value, badge) {
  const box = document.createElement('div');
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  if (badge) {
    const b = document.createElement('span');
    b.className = `badge${badge === 'bad' ? ' blocked' : ''}`;
    b.textContent = value;
    dd.append(b);
  } else dd.textContent = value || '—';
  box.append(dt, dd);
  grid.append(box);
}

function render(data) {
  const e = data.employee;
  const name = [e.firstname, e.lastname].filter(Boolean).join(' ') || e.empno;
  document.getElementById('title').textContent = name;
  document.title = `${name} - Hope, Inc. ERP`;
  const grid = document.getElementById('grid');
  grid.replaceChildren();
  field(grid, 'Employee No.', e.empno);
  field(grid, 'Last name', e.lastname);
  field(grid, 'First name', e.firstname);
  field(grid, 'Gender', GENDER[e.gender]);
  field(grid, 'Birth date', e.birthdate);
  field(grid, 'Hire date', e.hiredate);
  field(grid, 'Employment', e.employment, e.sepdate ? 'bad' : 'ok');
  field(grid, 'Separation date', e.sepdate);
  if ('status' in e) { // Admins only
    field(grid, 'Record status', e.status, e.deleted ? 'bad' : 'ok');
    field(grid, 'Stamp', e.stamp);
  }
  show('details', true);

  const h = data.history;
  show('job-section', Boolean(h));
  show('restricted', !h);
  if (!h) return;
  const cur = h.current;
  document.getElementById('current').textContent = cur
    ? `Current job: ${cur.job}, ${cur.department} · ${money.format(cur.salary ?? 0)} (since ${cur.effdate})`
    : 'Current job: — (no job history yet)';
  const list = document.getElementById('timeline');
  list.replaceChildren();
  for (const r of h.timeline) { // newest first
    const li = document.createElement('li');
    if (r.current) li.className = 'current';
    const when = document.createElement('div');
    when.className = 'when';
    when.textContent = r.upcoming ? `${r.effdate} (upcoming)` : r.effdate;
    if (r.current) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = 'Current';
      when.append(' ', b);
    }
    const what = document.createElement('div');
    what.className = 'what';
    what.textContent = `${r.job} · ${r.department}`;
    const pay = document.createElement('div');
    pay.className = 'muted';
    pay.textContent = r.salary == null ? '—' : money.format(r.salary);
    li.append(when, what, pay);
    list.append(li);
  }
  if (!h.timeline.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'No job history yet.';
    list.append(li);
  }
  const manage = document.getElementById('manage');
  manage.href = `/job-history.html?empno=${encodeURIComponent(e.empno)}`;
  manage.hidden = false;
}

async function load() {
  if (!/^\d{5}$/.test(empno)) { flash('bad', 'No employee was chosen. Go back to Employees and pick one.'); return; }
  try {
    const res = await fetch(`/api/employees/${encodeURIComponent(empno)}`);
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { flash('bad', 'You do not have access to employee profiles.'); return; }
    if (res.status === 404) { flash('bad', json.error || 'Employee not found.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load the profile.'); return; }
    render(json);
  } catch {
    flash('bad', 'Could not reach the server. Please try again.');
  }
}

load();
