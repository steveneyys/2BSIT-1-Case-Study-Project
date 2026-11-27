'use strict';

// Customer balance (S4-DEV-06): every live sale of one customer with total, paid and balance, and the customer's balance.
// Opened as /customer-balance.html?custno=C0001. Read-only; the server works out every figure. All text uses textContent.
const custno = new URLSearchParams(window.location.search).get('custno') || '';
const msg = document.getElementById('msg');
const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

function flash(kind, text) { msg.className = kind; msg.textContent = text; }

function draw(d) {
  document.title = `${d.customer.custno} - Customer Balance - Hope, Inc. ERP`;
  document.getElementById('title').textContent = `Customer balance · ${d.customer.custno}`;
  document.getElementById('heading').textContent = d.customer.name || d.customer.custno;
  const rows = document.getElementById('rows');
  rows.replaceChildren();
  if (!d.sales.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'muted';
    td.textContent = 'This customer has no sales.';
    tr.append(td);
    rows.append(tr);
  }
  for (const s of d.sales) {
    const tr = document.createElement('tr');
    const first = document.createElement('td');
    const link = document.createElement('a');
    link.href = `/balance.html?transno=${encodeURIComponent(s.transno)}`;
    link.textContent = s.transno;
    first.append(link);
    tr.append(first);
    for (const [text, cls] of [[s.salesdate || '—'], [PESO.format(s.total), 'num'], [PESO.format(s.paid), 'num'], [PESO.format(s.balance), 'num']]) {
      const td = document.createElement('td');
      td.textContent = text;
      if (cls) td.className = cls;
      tr.append(td);
    }
    rows.append(tr);
  }
  document.getElementById('sum').textContent = `Customer balance ${PESO.format(d.balance)}`;
  const standing = document.getElementById('standing');
  standing.textContent = d.standing;
  standing.className = `badge${d.standing === 'Balance due' ? ' blocked' : ''}`;
  const note = document.getElementById('note');
  note.hidden = d.complete;
  note.textContent = d.complete ? '' : `${d.unpriced} sale line${d.unpriced === 1 ? '' : 's'} ${d.unpriced === 1 ? 'has' : 'have'} no price on the sale date, so some sale totals are incomplete.`;
  document.getElementById('card').hidden = false;
}

(async () => {
  if (!custno) { flash('bad', 'No customer was chosen. Open a balance from a sale first.'); return; }
  try {
    const res = await fetch(`/api/balances/customers/${encodeURIComponent(custno)}`);
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { flash('bad', 'You do not have access to balances. Ask an administrator to assign a sales right.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load this balance.'); return; }
    draw(json);
  } catch {
    flash('bad', 'Could not reach the server. Please try again.');
  }
})();
