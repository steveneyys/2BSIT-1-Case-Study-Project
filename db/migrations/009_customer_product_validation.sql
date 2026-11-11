-- S2-DBA-03: validation rules for customer and product.
-- Already in place since 001: pay_ck (payterm must be COD, 30D or 45D) and
-- unit_ck (unit must be pc, ea, mtr, pkg or ltr). A CHECK alone still lets NULL through,
-- so these columns are now required, and names/descriptions may not be blank.

ALTER TABLE customer ALTER COLUMN payterm SET NOT NULL;
ALTER TABLE product  ALTER COLUMN unit    SET NOT NULL;

ALTER TABLE customer ADD CONSTRAINT custname_ck
    CHECK (custname IS NOT NULL AND btrim(custname) <> '');
ALTER TABLE product  ADD CONSTRAINT proddesc_ck
    CHECK (description IS NOT NULL AND btrim(description) <> '');
