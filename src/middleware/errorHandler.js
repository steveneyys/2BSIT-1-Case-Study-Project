'use strict';

function notFound(req, res) {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.status(404).send('Page not found');
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  console.error(`[error] ${status}:`, err.message);
  // Never leak internals (stack traces, SQL, connection strings) to the client.
  res.status(status).json({ error: err.publicMessage || (status === 500 ? 'Internal server error' : err.message) });
}

module.exports = { notFound, errorHandler };
