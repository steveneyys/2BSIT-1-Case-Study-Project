-- S2-DBA-05: demo data for the Customer, Product and Price History screens.
-- All demo rows start with D (customers D0001-D0010) or DM (products DM0001-DM0008)
-- so they are easy to recognise. They show every case a demo needs: all three payment
-- terms, all five units, products with several price changes, a product with no price
-- before a later date, and one deleted customer and one deleted product to demo Restore.

SELECT set_audit_user('demo-seed');     -- stamp and audit trail show who loaded this

INSERT INTO customer (custno, custname, address, payterm) VALUES
  ('D0001', 'Demo Cafe Manila',    '12 Rizal Ave, Manila',                 'COD'),
  ('D0002', 'Demo Hardware Co',    '45 Aurora Blvd, Quezon City',          '30D'),
  ('D0003', 'Demo Pharmacy',       '8 Mabini St, Makati City',             'COD'),
  ('D0004', 'Demo Bookshop',       '230 Taft Ave, Pasay City',             '45D'),
  ('D0005', 'Demo Tech Repair',    '77 Ortigas Ave, Pasig City',           '30D'),
  ('D0006', 'Demo Bakery',         '19 Katipunan Ave, Quezon City',        'COD'),
  ('D0007', 'Demo Logistics',      '501 Edsa, Mandaluyong City',           '45D'),
  ('D0008', 'Demo Salon',          '3 Session Rd, Baguio City',            '30D'),
  ('D0009', 'Demo School Supply',  '66 Colon St, Cebu City',               '45D'),
  ('D0010', 'Demo Old Restaurant', '90 Roxas Blvd, Manila',                'COD')
ON CONFLICT (custno) DO NOTHING;

INSERT INTO product (prodcode, description, unit) VALUES
  ('DM0001', 'Demo HDMI Cable 2m',      'pc'),
  ('DM0002', 'Demo Copper Wire',        'mtr'),
  ('DM0003', 'Demo A4 Paper Ream',      'pkg'),
  ('DM0004', 'Demo Cleaning Solvent',   'ltr'),
  ('DM0005', 'Demo Webcam 1080p',       'ea'),
  ('DM0006', 'Demo Extension Cord',     'pc'),
  ('DM0007', 'Demo Printer Ink',        'ltr'),
  ('DM0008', 'Demo Discontinued Item',  'ea')
ON CONFLICT (prodcode) DO NOTHING;

INSERT INTO pricehist (effdate, prodcode, unitprice) VALUES
  ('2025-01-01', 'DM0001', 150.00), ('2025-07-01', 'DM0001', 165.00), ('2026-01-01', 'DM0001', 180.00),
  ('2025-03-01', 'DM0002',  22.50), ('2025-10-01', 'DM0002',  25.00),
  ('2025-01-01', 'DM0003', 240.00),
  ('2025-05-01', 'DM0004',  95.00), ('2026-02-01', 'DM0004', 105.00),
  ('2025-06-01', 'DM0005', 1200.00), ('2025-12-01', 'DM0005', 1099.00), ('2026-06-01', 'DM0005', 999.00),
  ('2025-01-01', 'DM0006',  85.00),
  ('2026-03-01', 'DM0007', 450.00),
  ('2025-01-01', 'DM0008',  60.00)
ON CONFLICT (effdate, prodcode) DO NOTHING;

-- Deleted examples for the Restore demo (a product's prices must be deleted first)
UPDATE customer SET is_deleted = true WHERE custno = 'D0010';
UPDATE pricehist SET is_deleted = true WHERE prodcode = 'DM0008';
UPDATE product SET is_deleted = true WHERE prodcode = 'DM0008';
