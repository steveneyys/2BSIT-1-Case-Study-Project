'use strict';

// Shared header and tab bar for signed-in pages. The server decides what is offered (GET /api/menu);
// this file only draws it. Text is inserted with textContent, never innerHTML.
window.hopeMenu = (async () => {
  const res = await fetch('/api/menu');
  if (!res.ok) { window.location.href = '/login.html'; return null; }
  return res.json();
})();

(async () => {
  const menu = await window.hopeMenu;
  if (!menu) return;
  const here = window.location.pathname;
  const who = document.getElementById('who');
  who.textContent = `${menu.user.firstName} ${menu.user.lastName}`;
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.textContent = '\u00b7';
  const meta = document.createElement('span');
  meta.className = 'muted';
  meta.textContent = `${menu.user.email} / ${menu.user.role.charAt(0).toUpperCase()}${menu.user.role.slice(1)}`;
  who.replaceChildren(who.textContent, dot, meta);

  const tabs = document.getElementById('tabs');
  const add = (label, href) => {
    const el = document.createElement(href ? 'a' : 'span');
    el.textContent = label;
    if (href) {
      el.href = href;
      if (here === href) { el.classList.add('active'); el.setAttribute('aria-current', 'page'); }
    } else { el.className = 'soon'; el.title = 'Available in a later sprint'; }
    tabs.append(el);
  };
  add('Dashboard', '/home.html');
  for (const m of menu.modules) add(m.name, m.href);
  for (const a of menu.admin) add(a.label, a.href);
})();

document.getElementById('logout').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});
