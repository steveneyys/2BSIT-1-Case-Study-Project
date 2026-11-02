'use strict';

// Dashboard (S1-DEV-08). The server decides what this person may see; this file only draws it.
const tiles = document.getElementById('tiles');

function tile(title, text, href) {
  const el = document.createElement(href ? 'a' : 'div');
  el.className = `tile${href ? '' : ' disabled'}`;
  if (href) el.href = href;
  const k = document.createElement('div');
  k.className = 'k';
  k.textContent = title;
  const v = document.createElement('div');
  v.className = 'v';
  v.textContent = text;
  el.append(k, v);
  return el;
}

(async () => {
  const menu = await window.hopeMenu;
  if (!menu) return;

  document.getElementById('hello').textContent = 'Dashboard';
  document.getElementById('meta').textContent = `Welcome back, ${menu.user.firstName}. Choose a business module to continue.`;

  for (const m of menu.modules) tiles.append(tile(m.name, m.href ? 'Open' : 'Coming soon', m.href));

  if (menu.admin.length) {
    const links = document.getElementById('admin-links');
    for (const a of menu.admin) {
      const link = document.createElement('a');
      link.className = 'btn primary';
      link.href = a.href;
      link.textContent = a.label;
      links.append(link);
    }
    document.getElementById('admin-card').hidden = false;
  }

  if (!menu.modules.length && !menu.admin.length) {
    const msg = document.getElementById('msg');
    msg.className = 'ok';
    msg.textContent = 'You do not have access to any module yet. Ask an administrator to assign rights to your account.';
  }
})();
