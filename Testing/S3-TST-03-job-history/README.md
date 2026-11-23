# S3-TST-03 Job History Tests (Effective Date and Salary)

**System:** Hope ERP  **Sprint:** 3  **Tester:** Llabres

**Status values:** Pass, Fail, or Blocked.

**Rule from the guide:** each promotion, transfer or raise is a new job history row. The row with the latest effective date is the employee's current job.

**Test accounts to use:** Admin, and an approved User who has the View Job History right.

## A. View Job History

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-JH-01 | Open the job history (Admin) | Click History on an employee | List shows job, department, effective date and salary, plus Status and Stamp | Works as expected | Pass |
| TC-JH-02 | Current job | Look at an employee with several rows | The row with the latest effective date is the current job | Works as expected | Pass |
| TC-JH-03 | Job timeline | Open the employee profile | Timeline shows the rows in order of effective date | Works as expected | Pass |
| TC-JH-04 | User with the View Job History right | Log in as a User with the right, click History | Job history and salary are shown | Works as expected | Pass |
| TC-JH-05 | User view hides Status and Stamp | Log in as a User with the right, open the history | No Status or Stamp columns, no deleted rows | Works as expected | Pass |

## B. Add Job History

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-JH-06 | Add with valid details | Add a row with job, department, effective date and salary, save | Row is saved and the Stamp shows CREATED | Works as expected | Pass |
| TC-JH-07 | Add with empty job | Leave the job blank, save | Error shown, nothing saved | Works as expected | Pass |
| TC-JH-08 | Add with empty effective date | Leave the date blank, save | Error shown, nothing saved | Works as expected | Pass |
| TC-JH-09 | Negative salary | Type -1000 as the salary, save | Rejected with a clear message | Works as expected | Pass |
| TC-JH-10 | Salary is not a number | Type "abc" as the salary, save | Rejected with a clear message | Works as expected | Pass |
| TC-JH-11 | Salary too large | Type a salary above 99,999,999.99, save | Clear error message, no server error | Works as expected | Pass |
| TC-JH-12 | Same effective date again | Add a row with an effective date the employee already has | Rejected (no duplicate effective dates) | Works as expected | Pass |
| TC-JH-13 | Same job on a different date | Add the same job again with a different effective date | Saved (an employee can hold the same job again later) | Works as expected | Pass |
| TC-JH-14 | Effective date before hire date | Add a row with a date earlier than the employee's hire date | Rejected with a clear message. Check the team design if unsure | Works as expected | Pass |

## C. Effective Date and Current Job

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-JH-15 | Newer date becomes current | Add a row with a later effective date than all others | New row becomes the current job | Works as expected | Pass |
| TC-JH-16 | Older date does not change current | Add a row with a date earlier than the current one | Current job does not change | Works as expected | Pass |
| TC-JH-17 | Future effective date | Add a row with a date in the future | Not the current job until that date. Check the team design if unsure | Works as expected | Pass |

## D. Edit Job History

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-JH-18 | Edit the salary | Click Edit on a row, change the salary, save | Change is saved and the Stamp shows EDITED | Works as expected | Pass |
| TC-JH-19 | Edit the date to an existing date | Change the effective date to one the employee already has, save | Rejected, old data is kept | Works as expected | Pass |
| TC-JH-20 | Edit job and department | Change the job and the department, save | Change is saved and shown in the history | Works as expected | Pass |

## E. Delete and Restore

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-JH-21 | Delete a row | Click Delete on a row, confirm | Row becomes Inactive, shaded, Stamp shows DELETED | Works as expected | Pass |
| TC-JH-22 | Deleted row is not the current job | Delete the newest row | Current job falls back to the previous row | Works as expected | Pass |
| TC-JH-23 | Restore a row | Click Restore on the deleted row | Row is Active again and the current job is calculated again | Works as expected | Pass |
| TC-JH-24 | Only row deleted | Delete the only job history row of an employee | Employee shows no current job (for example "—"), no error | Works as expected | Pass |
