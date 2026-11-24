'use strict';

// Links between the Human Resources screens, shown only for screens the person has a right for.
// This only hides links: the server still refuses a page or an action without the right.
(async () => {
  const PAGES = [
    { label: 'Departments', href: '/departments.html', rights: ['DEPT_ADD', 'DEPT_EDIT', 'DEPT_DELETE'] },
    { label: 'Jobs', href: '/jobs.html', rights: ['JOB_ADD', 'JOB_EDIT', 'JOB_DELETE'] },
    { label: 'Employees', href: '/employees.html', rights: ['EMP_ADD', 'EMP_EDIT', 'EMP_DELETE'] },
  ];
  const nav = document.getElementById('hr-nav');
  if (!nav) return;
  try {
    const res = await fetch('/api/menu/rights');
    if (!res.ok) return;
    const mine = await res.json();
    const allowed = PAGES.filter((p) => mine.all || p.rights.some((r) => mine.rights.includes(r)));
    if (allowed.length < 2) return; // a single screen needs no navigation
    for (const p of allowed) {
      const a = document.createElement('a');
      a.href = p.href;
      a.textContent = p.label;
      if (window.location.pathname === p.href) a.setAttribute('aria-current', 'page');
      nav.append(a);
    }
    nav.hidden = false;
  } catch {
    /* navigation is a convenience; the page works without it */
  }
})();
