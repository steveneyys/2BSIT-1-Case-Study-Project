-- S3-DBA-06 (part 1): indexes for the HR screens and for the delete checks.
-- Every index covers only non-deleted rows, matching the *_active views and the checks.
-- Requires pg_trgm (created in migration 007).

-- Employee list: search by name, sort by name
CREATE INDEX employee_lastname_trgm_idx  ON employee USING gin (lastname gin_trgm_ops)  WHERE NOT is_deleted;
CREATE INDEX employee_firstname_trgm_idx ON employee USING gin (firstname gin_trgm_ops) WHERE NOT is_deleted;
CREATE INDEX employee_name_idx ON employee (lower(lastname), lower(firstname)) WHERE NOT is_deleted;

-- Delete checks look for active child rows by parent key; without these they scan the whole table
CREATE INDEX jobhistory_dept_idx   ON jobhistory  (deptcode) WHERE NOT is_deleted;
CREATE INDEX jobhistory_job_idx    ON jobhistory  (jobcode)  WHERE NOT is_deleted;
CREATE INDEX sales_cust_idx        ON sales       (custno)   WHERE NOT is_deleted;
CREATE INDEX sales_emp_idx         ON sales       (empno)    WHERE NOT is_deleted;
CREATE INDEX salesdetail_prod_idx  ON salesdetail (prodcode) WHERE NOT is_deleted;
CREATE INDEX payment_trans_idx     ON payment     (transno)  WHERE NOT is_deleted;
