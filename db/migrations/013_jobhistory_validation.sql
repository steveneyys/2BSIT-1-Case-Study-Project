-- S3-DBA-02: job history validation.
-- 1. An employee can have only one active job-history change per effective date (the
--    primary key allowed two different jobs on the same date, which is ambiguous).
-- 2. A job-history change cannot take effect before the employee's hire date, and a hire
--    date cannot be moved after existing job history.

CREATE UNIQUE INDEX jobhistory_emp_effdate_uq ON jobhistory (empno, effdate) WHERE NOT is_deleted;

CREATE OR REPLACE FUNCTION trg_jobhistory_check_hire() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE v_hire DATE;
BEGIN
    IF NEW.is_deleted THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND NOT OLD.is_deleted
       AND OLD.empno = NEW.empno AND OLD.effdate = NEW.effdate THEN
        RETURN NEW;                                   -- ordinary edit (job, salary, department)
    END IF;
    SELECT hiredate INTO v_hire FROM employee WHERE empno = NEW.empno;
    IF v_hire IS NOT NULL AND NEW.effdate < v_hire THEN
        RAISE EXCEPTION 'Job history date % is before the hire date % of employee %.',
                        NEW.effdate, v_hire, NEW.empno;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER jobhistory_biu_hire BEFORE INSERT OR UPDATE ON jobhistory
    FOR EACH ROW EXECUTE FUNCTION trg_jobhistory_check_hire();

CREATE OR REPLACE FUNCTION trg_employee_check_hire() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.hiredate IS NOT NULL AND NEW.hiredate IS DISTINCT FROM OLD.hiredate
       AND EXISTS (SELECT 1 FROM jobhistory
                    WHERE empno = NEW.empno AND NOT is_deleted AND effdate < NEW.hiredate) THEN
        RAISE EXCEPTION 'Hire date % is after existing job history of employee %.',
                        NEW.hiredate, NEW.empno;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER employee_bu_hire BEFORE UPDATE ON employee
    FOR EACH ROW EXECUTE FUNCTION trg_employee_check_hire();
