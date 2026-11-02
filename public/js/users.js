'use strict';

// All text is inserted with textContent / createElement (never innerHTML): names come from users.
const rowsEl = document.getElementById('rows');
const msgEl = document.getElementById('msg');
const dialog = document.getElementById('user-dialog');
const form = document.getElementById('user-form');
const FIELDS = ['firstName', 'lastName', 'email', 'role'];
let me = null;
let editingId = null;
let allUsers = [];
let statusFilter = 'all';

function flash(kind, text) {
  msgEl.className = kind;
  msgEl.textContent = text;
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { window.location.href = '/login.html'; throw new Error('signed out'); }
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

function cell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function statusOf(u) {
  if (u.isBlocked) return ['Blocked', 'blocked'];
  return u.status === 'pending' ? ['Pending', 'pending'] : ['Active', 'active'];
}

const TABS = [['all', 'All'], ['active', 'Active'], ['pending', 'Pending'], ['blocked', 'Blocked']];

function renderTabs() {
  const box = document.getElementById('status-tabs');
  box.replaceChildren();
  for (const [key, label] of TABS) {
    const n = key === 'all' ? allUsers.length : allUsers.filter((u) => statusOf(u)[1] === key).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${label} ${n}`;
    b.setAttribute('aria-pressed', String(statusFilter === key));
    b.addEventListener('click', () => { statusFilter = key; applyFilter(); });
    box.append(b);
  }
}

function button(label, className, onClick, disabled = false, title = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn ${className}`.trim();
  b.textContent = label;
  b.disabled = disabled;
  if (title) b.title = title;
  b.addEventListener('click', onClick);
  return b;
}

function render(users) {
  rowsEl.replaceChildren();
  if (!users.length) {
    const tr = document.createElement('tr');
    tr.append(cell('No users found.', 'muted'));
    tr.firstChild.colSpan = 5;
    rowsEl.append(tr);
    return;
  }
  for (const u of users) {
    const tr = document.createElement('tr');
    tr.append(cell(`${u.firstName} ${u.lastName}${u.isSelf ? ' (you)' : ''}`), cell(u.email), cell(u.role));
    const [label, cls] = statusOf(u);
    const statusTd = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${cls}`;
    badge.textContent = label;
    statusTd.append(badge);
    const actionsTd = document.createElement('td');
    if (u.canManage) {
      const box = document.createElement('div');
      box.className = 'actions';
      if (u.canApprove) box.append(button('Approve', 'primary', () => act(u, 'approve', `${u.firstName} ${u.lastName} was approved.`)));
      if (u.canMakeAdmin) box.append(button('Make admin', '', () => act(u, 'make-admin', `${u.firstName} ${u.lastName} is now an admin.`, `Make ${u.firstName} ${u.lastName} an admin?`)));
      if (u.canRemoveAdmin) box.append(button('Remove admin', '', () => act(u, 'remove-admin', `${u.firstName} ${u.lastName} is now a regular user.`, `Remove admin rights from ${u.firstName} ${u.lastName}?`)));
      box.append(
        u.isBlocked
          ? button('Unblock', '', () => toggleBlock(u, false))
          : button('Block', 'danger', () => toggleBlock(u, true), u.isSelf, u.isSelf ? 'You cannot block yourself' : ''),
        ...(u.canSetRights ? [button('Rights', '', () => openRights(u))] : []),
        button('Edit', '', () => openDialog(u))
      );
      actionsTd.append(box);
    } else {
      actionsTd.textContent = '—'; // em dash, as in the guide
      actionsTd.className = 'muted';
    }
    tr.append(statusTd, actionsTd);
    rowsEl.append(tr);
  }
}

async function load() {
  const q = document.getElementById('search').value.trim();
  const { ok, status, json } = await api('GET', `/api/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  if (status === 403) { flash('bad', 'You do not have access to User Management.'); rowsEl.replaceChildren(); return; }
  if (!ok) { flash('bad', json.error || 'Could not load users.'); return; }
  msgEl.className = '';
  allUsers = json.users;
  applyFilter();
}

function applyFilter() {
  renderTabs();
  render(statusFilter === 'all' ? allUsers : allUsers.filter((u) => statusOf(u)[1] === statusFilter));
}

// Approve / make admin / remove admin: POST /api/users/:id/<action>
async function act(u, action, okText, confirmText) {
  if (confirmText && !window.confirm(confirmText)) return;
  const { ok, json } = await api('POST', `/api/users/${u.id}/${action}`);
  if (!ok) return flash('bad', json.error || 'Action failed.');
  flash('ok', okText);
  load();
}

async function toggleBlock(u, block) {
  if (block && !window.confirm(`Block ${u.firstName} ${u.lastName}? They will not be able to sign in.`)) return;
  const { ok, json } = await api('POST', `/api/users/${u.id}/${block ? 'block' : 'unblock'}`);
  if (!ok) return flash('bad', json.error || 'Action failed.');
  flash('ok', `${u.firstName} ${u.lastName} was ${block ? 'blocked' : 'unblocked'}.`);
  load();
}

function showErrors(errors = {}) {
  for (const f of FIELDS) {
    const el = form.querySelector(`[data-for="${f}"]`);
    if (el) el.textContent = errors[f] || '';
  }
}

function openDialog(user) {
  editingId = user ? user.id : null;
  document.getElementById('dialog-title').textContent = user ? 'Edit User' : 'Add User';
  document.getElementById('save-btn').textContent = 'Save User';
  document.getElementById('invite-note').hidden = Boolean(user);
  document.getElementById('role-wrap').hidden = me.role !== 'superadmin';
  form.elements.firstName.value = user ? user.firstName : '';
  form.elements.lastName.value = user ? user.lastName : '';
  form.elements.email.value = user ? user.email : '';
  form.elements.role.value = user ? user.role : 'user';
  form.elements.role.disabled = Boolean(user && user.isSelf); // nobody can change their own role
  showErrors();
  document.getElementById('form-error').textContent = '';
  dialog.showModal();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showErrors();
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  const body = {
    firstName: form.elements.firstName.value,
    lastName: form.elements.lastName.value,
    email: form.elements.email.value,
  };
  if (me.role === 'superadmin' && !form.elements.role.disabled) body.role = form.elements.role.value;
  try {
    const { ok, json } = editingId
      ? await api('PATCH', `/api/users/${editingId}`, body)
      : await api('POST', '/api/users', body);
    if (ok) {
      dialog.close();
      flash('ok', editingId ? 'User updated.' : 'User added. An email with a set-password link was sent.');
      load();
    } else if (json.errors) showErrors(json.errors);
    else document.getElementById('form-error').textContent = json.error || 'Something went wrong.';
  } finally {
    saveBtn.disabled = false;
  }
});

document.getElementById('cancel-btn').addEventListener('click', () => dialog.close());
document.getElementById('user-close').addEventListener('click', () => dialog.close());
document.getElementById('add-btn').addEventListener('click', () => openDialog(null));
let timer;
document.getElementById('search').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });

// ---- Rights dialog (S1-DEV-07) ----
const rightsDialog = document.getElementById('rights-dialog');
const rightsBody = document.getElementById('rights-body');
let rightsUser = null;
let catalog = null;

const boxes = () => [...rightsBody.querySelectorAll('input[data-right]')];

function updateCount() {
  document.getElementById('rights-count').textContent = `Module and function access \u00b7 ${boxes().length} rights`;
}

function buildRights(modules, granted) {
  rightsBody.replaceChildren();
  if (!modules.length) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'No rights are defined yet. Ask the DB Admin to run the rights seed (S1-DBA-05).';
    rightsBody.append(p);
    return;
  }
  for (const m of modules) {
    const mod = document.createElement('section');
    mod.className = 'rights-module';
    const head = document.createElement('header');
    const title = document.createElement('h3');
    title.textContent = m.moduleName;
    const shortcuts = document.createElement('span');
    const setAll = (on) => () => mod.querySelectorAll('input[data-right]').forEach((b) => { b.checked = on; });
    for (const [label, on] of [['All', true], ['None', false]]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.setAttribute('aria-label', `${label} rights in ${m.moduleName}`);
      b.addEventListener('click', setAll(on));
      shortcuts.append(b);
    }
    head.append(title, shortcuts);
    const list = document.createElement('div');
    list.className = 'rights-list';
    for (const r of m.rights) {
      const label = document.createElement('label');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.dataset.right = r.code;
      box.checked = granted.has(r.code);
      label.append(box, document.createTextNode(r.description));
      list.append(label);
    }
    mod.append(head, list);
    rightsBody.append(mod);
  }
  updateCount();
}

async function openRights(u) {
  rightsUser = u;
  document.getElementById('rights-error').textContent = '';
  document.getElementById('rights-title').textContent = 'Assign Rights';
  document.getElementById('rights-who').textContent = `${u.firstName} ${u.lastName} \u00b7 ${u.email}`;
  const [cat, mine] = await Promise.all([
    catalog ? { ok: true, json: catalog } : api('GET', '/api/rights/catalog'),
    api('GET', `/api/rights/users/${u.id}`),
  ]);
  if (!cat.ok || !mine.ok) return flash('bad', (mine.json && mine.json.error) || 'Could not load rights.');
  catalog = cat.json;
  buildRights(catalog.modules, new Set(mine.json.rights));
  rightsDialog.showModal();
}

document.getElementById('rights-cancel').addEventListener('click', () => rightsDialog.close());
document.getElementById('rights-close').addEventListener('click', () => rightsDialog.close());
document.getElementById('rights-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const save = document.getElementById('rights-save');
  save.disabled = true;
  try {
    const rights = boxes().filter((b) => b.checked).map((b) => b.dataset.right);
    const { ok, json } = await api('PUT', `/api/rights/users/${rightsUser.id}`, { rights });
    if (!ok) { document.getElementById('rights-error').textContent = (json.errors && json.errors.rights) || json.error || 'Could not save.'; return; }
    rightsDialog.close();
    const n = json.changes.granted.length + json.changes.revoked.length;
    flash('ok', n ? `Rights saved for ${rightsUser.firstName} ${rightsUser.lastName} (${json.changes.granted.length} added, ${json.changes.revoked.length} removed).` : 'No changes to save.');
  } finally {
    save.disabled = false;
  }
});

(async () => {
  const { ok, json } = await api('GET', '/api/auth/me');
  if (!ok) { window.location.href = '/login.html'; return; }
  me = json.user;
  if (me.role === 'user') { window.location.href = '/home.html'; return; }
  load();
})();
