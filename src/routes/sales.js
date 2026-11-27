'use strict';

const express = require('express');
const repo = require('../repositories/saleRepo');
const detailRepo = require('../repositories/saleDetailRepo');
const { createSaleDetails } = require('../services/saleDetails');
const { createSales, VIEW_RIGHTS, LIST_RIGHTS } = require('../services/sales');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireRight } = require('../middleware/permissions');

module.exports = function salesRoutes(db, perms) {
  const router = express.Router();
  const sales = createSales({ db, repo, perms });
  const details = createSaleDetails({ db, repo: detailRepo, saleRepo: repo, perms });

  // Server-side gate: signed in AND holding at least one sales right (admins and superadmins always do).
  router.use(requireAuth, requireRight(perms, ...VIEW_RIGHTS));

  const handle = (fn) => async (req, res, next) => {
    try {
      const { status, body } = await fn(req);
      res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  };

  router.get('/', requireRight(perms, ...LIST_RIGHTS), handle((req) => sales.list(req.user, req.query)));
  // Drop-down choices for the form. Registered before any "/:transno" route so "options" is never read as a number.
  router.get('/options', requireRight(perms, 'SALE_ADD', 'SALE_EDIT'), handle(() => sales.options()));
  router.post('/', requireRight(perms, 'SALE_ADD'), handle((req) => sales.create(req.user, req.body)));
  router.put('/:transno', requireRight(perms, 'SALE_EDIT'), handle((req) => sales.update(req.user, req.params.transno, req.body)));

  // Sale details (S4-DEV-02). Seeing a sale's lines, prices and total needs View Sale Details; each change needs its own right.
  const line = '/:transno/lines/:prodcode';
  router.get('/:transno', requireRight(perms, 'SALEDET_VIEW'), handle((req) => details.view(req.user, req.params.transno)));
  router.post('/:transno/lines', requireRight(perms, 'SALEDET_ADD'), handle((req) => details.create(req.user, req.params.transno, req.body)));
  router.put(line, requireRight(perms, 'SALEDET_EDIT'), handle((req) => details.update(req.user, req.params.transno, req.params.prodcode, req.body)));
  router.delete(line, requireRight(perms, 'SALEDET_DELETE'), handle((req) => details.remove(req.user, req.params.transno, req.params.prodcode)));
  router.post(`${line}/restore`, requireRole('admin', 'superadmin'), handle((req) => details.restore(req.user, req.params.transno, req.params.prodcode)));

  return router;
};
