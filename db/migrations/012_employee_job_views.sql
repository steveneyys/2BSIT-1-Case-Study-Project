-- S3-DBA-01: employee views for the HR screens and reports.
--
-- employee_current : one row per active employee with the job and department in effect
--                    today (latest job-history row on or before today). No salary column on
--                    purpose: salary is only shown with the View Job History right.
-- employee_job_timeline : every active job-history row with job and department names, the
--                    date it started and the date it ended (the next change), for the
--                    employee profile. Contains salary: show it only with JOBHIST_VIEW.
-- Soft-deleted employees and job-history rows are ignored. Future-dated changes do not
-- apply until their effective date.

CREATE VIEW employee_current AS
SELECT e.empno, e.lastname, e.firstname, e.gender, e.birthdate, e.hiredate, e.sepdate,
       cur.jobcode, j.jobdesc, cur.deptcode, d.deptname, cur.effdate AS job_since
  FROM employee_active e
  LEFT JOIN LATERAL (
        SELECT h.jobcode, h.deptcode, h.effdate
          FROM jobhistory h
         WHERE h.empno = e.empno AND NOT h.is_deleted AND h.effdate <= CURRENT_DATE
         ORDER BY h.effdate DESC, h.jobcode
         LIMIT 1
  ) cur ON TRUE
  LEFT JOIN job j        ON j.jobcode  = cur.jobcode
  LEFT JOIN department d ON d.deptcode = cur.deptcode;

CREATE VIEW employee_job_timeline AS
SELECT h.empno, h.effdate AS start_date,
       LEAD(h.effdate) OVER (PARTITION BY h.empno ORDER BY h.effdate, h.jobcode) AS end_date,
       h.jobcode, j.jobdesc, h.deptcode, d.deptname, h.salary
  FROM jobhistory h
  JOIN job j             ON j.jobcode  = h.jobcode
  LEFT JOIN department d ON d.deptcode = h.deptcode
 WHERE NOT h.is_deleted;
