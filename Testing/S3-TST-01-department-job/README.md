# S3-TST-01 Test Cases: Department and Job

**System:** Hope ERP  **Sprint:** 3  **Tester:** Llabres

**Status values:** Pass, Fail, or Blocked.

**Test accounts to use:** Admin, and an approved User who has the Human Resources module.

## A. Departments

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-DEP-01 | Departments tab opens (Admin) | Log in as Admin, open Human Resources, click the Departments tab | List shows department code and name, and a + Add Department button | Works as expected | Pass |
| TC-DEP-02 | Admin sees tabs, Status and Stamp | Log in as Admin, look at the list | Active / Inactive / All tabs with counts; Status and Stamp columns; deleted rows are shaded | Works as expected | Pass |
| TC-DEP-03 | User view is limited | Log in as an approved User with the HR module | Only active departments; no tabs, no Status or Stamp columns | Works as expected | Pass |
| TC-DEP-04 | User without the HR module | Log in as a User without the HR module, look at the menu, then paste the HR URL | Menu item is not shown and the URL is denied | Works as expected | Pass |
| TC-DEP-05 | Search by code or name | Type a department code, then part of a name | Only matching departments are shown | Works as expected | Pass |
| TC-DEP-06 | Add with valid details | Click + Add Department, fill in code and name, save | Department is saved as Active and shown in the list | Works as expected | Pass |
| TC-DEP-07 | Stamp after Add | Add a department, look at the Stamp (Admin) | CREATED, the user, and the date and time | Works as expected | Pass |
| TC-DEP-08 | Add with empty code | Leave the code blank, save | Error shown, nothing saved | Works as expected | Pass |
| TC-DEP-09 | Add with empty name | Leave the name blank, save | Error shown, nothing saved | Works as expected | Pass |
| TC-DEP-10 | Add with a code already used | Use an existing department code, save | Error says the code already exists | Works as expected | Pass |
| TC-DEP-11 | Code too long | Type a code longer than 3 characters, save | Clear error message, no server error | Works as expected | Pass |
| TC-DEP-12 | Name too long | Type a name longer than 20 characters, save | Clear error message, no server error | Works as expected | Pass |
| TC-DEP-13 | Edit and save | Click Edit, change the name, save | Change is saved and the Stamp shows EDITED | Works as expected | Pass |
| TC-DEP-14 | Code cannot be changed | Open Edit, look at the code | Code is not editable. Check the team design if unsure | Works as expected | Pass |
| TC-DEP-15 | Edit with empty name | Clear the name, save | Error shown, old data is kept | Works as expected | Pass |
| TC-DEP-16 | Delete an unused department | Delete a department that no job history uses, confirm | Department becomes Inactive, shaded, Stamp shows DELETED | Works as expected | Pass |
| TC-DEP-17 | Delete blocked when in use | Try to delete a department used by active job history | Delete is refused with a clear message, department stays Active | Works as expected | Pass |
| TC-DEP-18 | Restore a department | Click Restore on a deleted department | Department is Active again | Works as expected | Pass |

## B. Jobs

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-JOB-01 | Jobs tab opens (Admin) | Log in as Admin, open Human Resources, click the Jobs tab | List shows job code and description, and a + Add Job button | Works as expected | Pass |
| TC-JOB-02 | Admin sees tabs, Status and Stamp | Log in as Admin, look at the list | Active / Inactive / All tabs with counts; Status and Stamp columns; deleted rows are shaded | Works as expected | Pass |
| TC-JOB-03 | User view is limited | Log in as an approved User with the HR module | Only active jobs; no tabs, no Status or Stamp columns | Works as expected | Pass |
| TC-JOB-04 | Search by code or description | Type a job code, then part of a description | Only matching jobs are shown | Works as expected | Pass |
| TC-JOB-05 | Add with valid details | Click + Add Job, fill in code and description, save | Job is saved as Active, and the Stamp shows CREATED | Works as expected | Pass |
| TC-JOB-06 | Add with empty code | Leave the code blank, save | Error shown, nothing saved | Works as expected | Pass |
| TC-JOB-07 | Add with empty description | Leave the description blank, save | Error shown, nothing saved | Works as expected | Pass |
| TC-JOB-08 | Add with a code already used | Use an existing job code, save | Error says the code already exists | Works as expected | Pass |
| TC-JOB-09 | Code too long | Type a code longer than 4 characters, save | Clear error message, no server error | Works as expected | Pass |
| TC-JOB-10 | Description too long | Type a description longer than 20 characters, save | Clear error message, no server error | Works as expected | Pass |
| TC-JOB-11 | Edit and save | Click Edit, change the description, save | Change is saved and the Stamp shows EDITED | Works as expected | Pass |
| TC-JOB-12 | Code cannot be changed | Open Edit, look at the code | Code is not editable. Check the team design if unsure | Works as expected | Pass |
| TC-JOB-13 | Delete an unused job | Delete a job that no job history uses, confirm | Job becomes Inactive, shaded, Stamp shows DELETED | Works as expected | Pass |
| TC-JOB-14 | Delete blocked when in use | Try to delete a job used by active job history | Delete is refused with a clear message, job stays Active | Works as expected | Pass |
| TC-JOB-15 | Restore a job | Click Restore on a deleted job | Job is Active again | Works as expected | Pass |

## C. Safety

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-HRS-01 | Special characters | Add a department named `<b>Test</b> & "Co"` | Shown as plain text, not as bold or code | Works as expected | Pass |
| TC-HRS-02 | Add or Edit without login | Log out, then send an Add or Edit request directly (F12 tools or pasted URL) | Request is refused, nothing is saved | Works as expected | Pass |
| TC-HRS-03 | Too-long code on the server | Send a direct request with a 5-character department code (F12 tools) | Server refuses it, nothing is saved | Works as expected | Pass |
