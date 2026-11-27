'use strict';

const { parseDate } = require('./employee');

const MAX_TOP = 100;

// Filters of the ranked sales reports: From Date, To Date, Top N. All three are required once the report is generated.
// Returns { errors, value } with the dates as YYYY-MM-DD and topn as a number.
function parseRange(query = {}) {
  const errors = {};
  const from = parseDate(query.from);
  const to = parseDate(query.to);
  const rawTop = String(query.topn ?? '').trim();

  if (from === '') errors.from = 'Enter the From date.';
  else if (from === null) errors.from = 'Enter a real date as YYYY-MM-DD.';
  if (to === '') errors.to = 'Enter the To date.';
  else if (to === null) errors.to = 'Enter a real date as YYYY-MM-DD.';
  if (!errors.from && !errors.to && from > to) errors.from = 'The From date must be on or before the To date.';

  let topn = null;
  if (!rawTop) errors.topn = 'Enter how many rows to show (Top N).';
  else if (!/^\d+$/.test(rawTop) || Number(rawTop) < 1) errors.topn = 'Top N must be a whole number greater than 0.';
  else if (Number(rawTop) > MAX_TOP) errors.topn = `Top N cannot be more than ${MAX_TOP}.`;
  else topn = Number(rawTop);

  return { errors, value: { from: from || null, to: to || null, topn } };
}

module.exports = { parseRange, MAX_TOP };
