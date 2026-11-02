'use strict';

// The server decides what this person may see (GET /api/menu); this file only draws it.
// Text is inserted with textContent, never innerHTML.
const nav = document.getElementById('side-nav');
const tiles = document.getElementById('tiles');

function sideLink(label, href) {
  const el = document.createElement(href ? 'a' : 'span');
  el.textContent = label;
  if (href) el.href = href;
  else { el.className = 'soon'; el.title = 'Available in a later sprint'; }
  return el;
}

function tile(title, text, href) {
  const el = document.createElement(href ? 'a' : 'div');
  el.className = `tile${href ? '' : ' disabled'}`;
  if (href) el.href = href;
  const h = document.createElement('h2');
  h.textContent = title;
  const p = document.createElement('p');
  p.textContent = text;
  el.append(h, p);
  return el;
}

(async () => {
  const res = await fetch('/api/menu');
  if (!res.ok) { window.location.href = '/login.html'; return; }
  const menu = await res.json();

  document.getElementById('hello').textContent = `Hello, ${menu.user.firstName}`;
  document.getElementById('meta').textContent = `${menu.user.email} · ${menu.user.role}`;
  document.getElementById('who').textContent = `${menu.user.firstName} ${menu.user.lastName}`;

  for (const m of menu.modules) nav.append(sideLink(m.name, m.href));
  for (const a of menu.admin) nav.append(sideLink(a.label, a.href));

  for (const m of menu.modules) tiles.append(tile(m.name, m.href ? 'Open' : 'Coming soon', m.href));
  for (const a of menu.admin) tiles.append(tile(a.label, 'Open', a.href));

  if (!menu.modules.length && !menu.admin.length) {
    const msg = document.getElementById('msg');
    msg.className = 'ok';
    msg.textContent = 'You do not have access to any module yet. Ask an administrator to assign rights to your account.';
  }
})();

document.getElementById('logout').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});
