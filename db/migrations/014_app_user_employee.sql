-- S3-DBA-03: link a login account to an employee.
-- app_user.empno is optional (for example a Superadmin may not be an employee), must
-- point to an existing employee, and one employee can have only one active account.

ALTER TABLE app_user ADD COLUMN empno VARCHAR(5) REFERENCES employee(empno);

-- one active account per employee
CREATE UNIQUE INDEX app_user_empno_uq ON app_user (empno) WHERE empno IS NOT NULL AND NOT is_deleted;

-- cannot link an account to a deleted employee (reuses the S2-DBA-04 parent check)
CREATE TRIGGER app_user_biu_employee BEFORE INSERT OR UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION trg_check_parent('employee', 'empno', 'empno');

-- cannot delete an employee while an active account is linked to them
CREATE OR REPLACE FUNCTION trg_employee_check_user() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE v_n INT;
BEGIN
    IF NEW.is_deleted AND NOT OLD.is_deleted THEN
        SELECT count(*) INTO v_n FROM app_user WHERE empno = OLD.empno AND NOT is_deleted;
        IF v_n > 0 THEN
            RAISE EXCEPTION 'Cannot delete employee %: an active user account is linked to them.', OLD.empno;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER employee_bu_user BEFORE UPDATE ON employee
    FOR EACH ROW EXECUTE FUNCTION trg_employee_check_user();

-- the *_active view was created before this column existed; refresh it so it shows empno
-- (a SELECT * view only knows the columns that existed when it was created)
CREATE OR REPLACE VIEW app_user_active AS SELECT * FROM app_user WHERE NOT is_deleted;
