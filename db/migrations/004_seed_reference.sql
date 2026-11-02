-- S1-DBA-05 (part 1): reference data. Safe to re-run: every insert skips rows that exist.

INSERT INTO role (role_code, description) VALUES
  ('superadmin', 'System owner: everything, including assigning any role'),
  ('admin',      'Manager: manages Users and rights, cannot see or change Superadmins'),
  ('user',       'Staff: only the modules and actions an Admin has granted')
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO module (module_code, module_name, sort_order) VALUES
  ('CUSTOMER', 'Customer Management', 1),
  ('PRODUCT', 'Product Management', 2),
  ('HR', 'Human Resources', 3),
  ('SALES', 'Sales Management', 4),
  ('REPORTS', 'Reports', 5)
ON CONFLICT (module_code) DO NOTHING;

INSERT INTO right_catalog (right_code, module_code, description, sort_order) VALUES
  ('CUST_ADD', 'CUSTOMER', 'Add Customer', 1),
  ('CUST_EDIT', 'CUSTOMER', 'Edit Customer', 2),
  ('CUST_DELETE', 'CUSTOMER', 'Delete Customer', 3),
  ('PROD_ADD', 'PRODUCT', 'Add Product', 4),
  ('PROD_EDIT', 'PRODUCT', 'Edit Product', 5),
  ('PROD_DELETE', 'PRODUCT', 'Delete Product', 6),
  ('PRICE_ADD', 'PRODUCT', 'Add Price', 7),
  ('PRICE_EDIT', 'PRODUCT', 'Edit Price', 8),
  ('PRICE_DELETE', 'PRODUCT', 'Delete Price', 9),
  ('JOB_ADD', 'HR', 'Add Job', 10),
  ('JOB_EDIT', 'HR', 'Edit Job', 11),
  ('JOB_DELETE', 'HR', 'Delete Job', 12),
  ('DEPT_ADD', 'HR', 'Add Department', 13),
  ('DEPT_EDIT', 'HR', 'Edit Department', 14),
  ('DEPT_DELETE', 'HR', 'Delete Department', 15),
  ('EMP_ADD', 'HR', 'Add Employee', 16),
  ('EMP_EDIT', 'HR', 'Edit Employee', 17),
  ('EMP_DELETE', 'HR', 'Delete Employee', 18),
  ('JOBHIST_VIEW', 'HR', 'View Job History', 19),
  ('JOBHIST_ADD', 'HR', 'Add Job History', 20),
  ('JOBHIST_EDIT', 'HR', 'Edit Job History', 21),
  ('JOBHIST_DELETE', 'HR', 'Delete Job History', 22),
  ('SALE_ADD', 'SALES', 'Add Sale', 23),
  ('SALE_EDIT', 'SALES', 'Edit Sale', 24),
  ('SALE_DELETE', 'SALES', 'Delete Sale', 25),
  ('SALEDET_VIEW', 'SALES', 'View Sale Details', 26),
  ('SALEDET_ADD', 'SALES', 'Add Sale Detail', 27),
  ('SALEDET_EDIT', 'SALES', 'Edit Sale Detail', 28),
  ('SALEDET_DELETE', 'SALES', 'Delete Sale Detail', 29),
  ('RPT_TOP_CUSTOMERS', 'REPORTS', 'Top Customers', 30),
  ('RPT_PRODUCT_MASTER', 'REPORTS', 'Product Master List', 31),
  ('RPT_TOP_PRODUCTS', 'REPORTS', 'Top Products', 32),
  ('RPT_ACTIVE_EMPLOYEES', 'REPORTS', 'Active Employees', 33),
  ('RPT_ALL_EMPLOYEES', 'REPORTS', 'All Employees', 34),
  ('RPT_EMP_JOB_HISTORY', 'REPORTS', 'Employee Job History', 35),
  ('RPT_TOP_SALES', 'REPORTS', 'Top Sales', 36)
ON CONFLICT (right_code) DO NOTHING;

-- Expect: 3 roles, 5 modules, 36 rights.
