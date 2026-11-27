'use strict';

// Reports page: the reports this person may open. The server decides the list; every report checks its own right again.
// All text goes in with textContent.
(async () => {
  const list = document.getElementById('list');
  const msg = document.getElementById('msg');
  try {
    const res = await fetch('/api/reports');
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { msg.className = 'bad'; msg.textContent = 'Report access restricted. You do not have permission to open any report.'; return; }
    if (!res.ok) { msg.className = 'bad'; msg.textContent = json.error || 'Could not load the reports.'; return; }
    if (!json.reports.length) { msg.className = 'bad'; msg.textContent = 'Report access restricted. You do not have permission to open any report.'; return; }
    for (const r of json.reports) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'btn primary';
      a.href = `/report.html?r=${encodeURIComponent(r.slug)}`;
      a.textContent = r.title;
      const p = document.createElement('span');
      p.className = 'muted';
      p.textContent = r.summary;
      li.append(a, p);
      list.append(li);
    }
  } catch {
    msg.className = 'bad';
    msg.textContent = 'Could not reach the server. Please try again.';
  }
})();
