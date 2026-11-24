-- S3-DBA-04: child-record rules for employee, department and job.
-- Already working (migration 001): an employee cannot be soft-deleted while they have active
-- job history or sales; a department or job cannot be soft-deleted while active job history
-- uses it. (Migration 014 added: not while an active user account is linked.)
-- Gap found while verifying: job history could still be added for, or restored under, a
-- deleted employee, job or department, and a sale could be added for a deleted employee.
-- This closes that, using the same parent check as S2-DBA-04.

CREATE TRIGGER jobhistory_biu_parent_emp  BEFORE INSERT OR UPDATE ON jobhistory
    FOR EACH ROW EXECUTE FUNCTION trg_check_parent('employee', 'empno', 'empno');
CREATE TRIGGER jobhistory_biu_parent_job  BEFORE INSERT OR UPDATE ON jobhistory
    FOR EACH ROW EXECUTE FUNCTION trg_check_parent('job', 'jobcode', 'jobcode');
CREATE TRIGGER jobhistory_biu_parent_dept BEFORE INSERT OR UPDATE ON jobhistory
    FOR EACH ROW EXECUTE FUNCTION trg_check_parent('department', 'deptcode', 'deptcode');
CREATE TRIGGER sales_biu_parent_emp       BEFORE INSERT OR UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION trg_check_parent('employee', 'empno', 'empno');
