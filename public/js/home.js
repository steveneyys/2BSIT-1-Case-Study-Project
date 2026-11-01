'use strict';

(async () => {
  const res = await fetch('/api/auth/me');
  if (!res.ok) { window.location.href = '/login.html'; return; }
  const { user } = await res.json();
  document.getElementById('hello').textContent = `Hello, ${user.firstName}`;
  document.getElementById('meta').textContent = `${user.email} · role: ${user.role}`;
})();

document.getElementById('logout').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});
