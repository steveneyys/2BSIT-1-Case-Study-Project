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

  if ((menu.superadmin || []).length) {
    const links = document.getElementById('super-links');
    for (const a of menu.superadmin) {
      const link = document.createElement('a');
      link.className = 'btn primary';
      link.href = a.href;
      link.textContent = a.label;
      links.append(link);
    }
    document.getElementById('super-card').hidden = false;
  }

  // Someone who typed the audit address without being a Superadmin is sent here with a reason.
  if (new URLSearchParams(window.location.search).get('restricted') === 'audit') {
    const msg = document.getElementById('msg');
    msg.className = 'bad';
    msg.textContent = `Audit viewer is restricted to Superadmin. Your ${menu.user.role.charAt(0).toUpperCase()}${menu.user.role.slice(1)} account cannot open full audit events.`;
  }

  if (!menu.modules.length && !menu.admin.length && !(menu.superadmin || []).length && !document.getElementById('msg').textContent) {
    const msg = document.getElementById('msg');
    msg.className = 'ok';
    msg.textContent = 'You do not have access to any module yet. Ask an administrator to assign rights to your account.';
  }
})();
