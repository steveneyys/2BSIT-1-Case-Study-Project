'use strict';

// Links between the Sales screens, shown only for screens the person has a right for.
// This only hides links: the server still refuses a page or an action without the right.
(async () => {
  const LIST = ['SALE_ADD', 'SALE_EDIT', 'SALE_DELETE', 'SALEDET_VIEW'];
  const PAGES = [
    { label: 'Sales', href: '/sales.html', also: ['/sale.html'], rights: [...LIST, 'SALEDET_ADD', 'SALEDET_EDIT', 'SALEDET_DELETE'] },
    { label: 'Payments', href: '/payments.html', also: [], rights: LIST },
  ];
  const nav = document.getElementById('sales-nav');
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
      if ([p.href, ...p.also].includes(window.location.pathname)) a.setAttribute('aria-current', 'page');
      nav.append(a);
    }
    nav.hidden = false;
  } catch {
    /* navigation is a convenience; the page works without it */
  }
})();
