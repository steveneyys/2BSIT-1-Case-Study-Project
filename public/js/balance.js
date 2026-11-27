'use strict';

// Transaction balance (S4-DEV-06): sale total, paid, balance and the active payments behind it. Read-only.
// Opened as /balance.html?transno=TR000001. The server works out every figure. All text goes in with textContent.
const transno = new URLSearchParams(window.location.search).get('transno') || '';
const msg = document.getElementById('msg');
const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

function flash(kind, text) { msg.className = kind; msg.textContent = text; }

function draw(d) {
  document.title = `${d.sale.transno} - Transaction Balance - Hope, Inc. ERP`;
  document.getElementById('title').textContent = `Transaction balance · ${d.sale.transno}`;
  document.getElementById('heading').textContent = `${d.sale.transno} · ${d.sale.customer || d.sale.custno || ''}`;
  document.getElementById('meta').textContent = `Sales date ${d.sale.salesdate || '—'}${d.sale.deleted ? ' · this sale is deleted (inactive)' : ''}`;
  document.getElementById('total').textContent = PESO.format(d.total);
  document.getElementById('paid').textContent = PESO.format(d.paid);
  document.getElementById('balance').textContent = PESO.format(d.balance);
  const standing = document.getElementById('standing');
  standing.textContent = d.standing;
  standing.className = `badge${d.standing === 'Balance due' ? ' blocked' : ''}`;
  const note = document.getElementById('note');
  note.hidden = d.complete;
  note.textContent = d.complete ? '' : `${d.unpriced} line${d.unpriced === 1 ? '' : 's'} of this sale ${d.unpriced === 1 ? 'has' : 'have'} no price on the sales date, so the sale total is incomplete.`;
  const rows = document.getElementById('rows');
  rows.replaceChildren();
  if (!d.payments.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'muted';
    td.textContent = `No payments recorded. Balance ${PESO.format(d.balance)}.`;
    tr.append(td);
    rows.append(tr);
  }
  for (const p of d.payments) {
    const tr = document.createElement('tr');
    for (const [text, cls] of [[p.orno], [p.paydate || '—'], [PESO.format(p.amount), 'num']]) {
      const td = document.createElement('td');
      td.textContent = text;
      if (cls) td.className = cls;
      tr.append(td);
    }
    rows.append(tr);
  }
  const inactive = document.getElementById('inactive');
  inactive.hidden = !d.inactivePayments;
  inactive.textContent = d.inactivePayments ? `${d.inactivePayments} inactive payment${d.inactivePayments === 1 ? ' is' : 's are'} not counted in the balance.` : '';
  document.getElementById('customer-link').href = `/customer-balance.html?custno=${encodeURIComponent(d.sale.custno || '')}`;
  document.getElementById('sale-link').href = `/sale.html?transno=${encodeURIComponent(d.sale.transno)}`;
  document.getElementById('card').hidden = false;
}

(async () => {
  if (!transno) { flash('bad', 'No sale was chosen. Go back to Payments and pick one.'); return; }
  try {
    const res = await fetch(`/api/balances/transactions/${encodeURIComponent(transno)}`);
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) { flash('bad', 'You do not have access to balances. Ask an administrator to assign a sales right.'); return; }
    if (!res.ok) { flash('bad', json.error || 'Could not load this balance.'); return; }
    draw(json);
  } catch {
    flash('bad', 'Could not reach the server. Please try again.');
  }
})();
