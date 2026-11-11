-- S2-DBA-01: indexes for the Customer and Product list screens (search, filter, sort).
-- The views customer_active and product_active already exist (migration 001);
-- the screens read from them, so every index below covers only non-deleted rows.

-- Fast "contains" search: WHERE custname ILIKE '%text%'
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX customer_name_trgm_idx    ON customer USING gin (custname gin_trgm_ops)    WHERE NOT is_deleted;
CREATE INDEX customer_address_trgm_idx ON customer USING gin (address gin_trgm_ops)     WHERE NOT is_deleted;
CREATE INDEX product_desc_trgm_idx     ON product  USING gin (description gin_trgm_ops) WHERE NOT is_deleted;

-- Filter by payment term / unit
CREATE INDEX customer_payterm_idx ON customer (payterm) WHERE NOT is_deleted;
CREATE INDEX product_unit_idx     ON product  (unit)    WHERE NOT is_deleted;

-- Sort lists by name / description: ORDER BY lower(custname), ORDER BY lower(description)
CREATE INDEX customer_name_idx ON customer (lower(custname))    WHERE NOT is_deleted;
CREATE INDEX product_desc_idx  ON product  (lower(description)) WHERE NOT is_deleted;
