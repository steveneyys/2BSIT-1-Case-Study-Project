-- S2-DBA-04: child-record rules for customer and product.
-- Already working (migration 001): a customer cannot be soft-deleted while it has active
-- sales, and a product cannot be soft-deleted while it has active sale lines or prices.
-- Gap found while verifying: new records could still be added under, or restored beneath,
-- a customer or product that is already deleted. This closes that.

CREATE OR REPLACE FUNCTION trg_check_parent() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_parent TEXT := TG_ARGV[0];      -- parent table, e.g. 'customer'
    v_pkcol  TEXT := TG_ARGV[1];      -- parent key column, e.g. 'custno'
    v_chcol  TEXT := TG_ARGV[2];      -- child column that points to the parent
    v_key    TEXT := to_jsonb(NEW) ->> TG_ARGV[2];
    v_gone   BOOLEAN;
BEGIN
    IF NEW.is_deleted THEN
        RETURN NEW;                                   -- saving a deleted row is fine
    END IF;
    IF TG_OP = 'UPDATE' AND NOT OLD.is_deleted AND (to_jsonb(OLD) ->> v_chcol) = v_key THEN
        RETURN NEW;                                   -- ordinary edit of an active row
    END IF;

    EXECUTE format('SELECT is_deleted FROM %I WHERE %I = $1', v_parent, v_pkcol)
       INTO v_gone USING v_key;
    IF v_gone THEN
        RAISE EXCEPTION 'Cannot save % record: % % is deleted. Restore it first.',
                        TG_TABLE_NAME, v_parent, v_key;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER sales_biu_parent        BEFORE INSERT OR UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION trg_check_parent('customer', 'custno', 'custno');
CREATE TRIGGER salesdetail_biu_parent  BEFORE INSERT OR UPDATE ON salesdetail
    FOR EACH ROW EXECUTE FUNCTION trg_check_parent('product', 'prodcode', 'prodcode');
CREATE TRIGGER pricehist_biu_parent    BEFORE INSERT OR UPDATE ON pricehist
    FOR EACH ROW EXECUTE FUNCTION trg_check_parent('product', 'prodcode', 'prodcode');
