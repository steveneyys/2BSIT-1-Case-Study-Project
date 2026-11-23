# S3-TST-04 Salary Visibility and HR Per-Right Permission Tests

**System:** Hope ERP  **Sprint:** 3  **Tester:** Llabres

**Rights tested (13):** Add, Edit, Delete for Job, Department and Employee; View, Add, Edit, Delete Job History (Student Guide section 3.8).

**Why this matters:** birth dates and salaries are personal data. The View Job History right decides who may see them.

**Result values:** Pass, Fail, or Blocked.

## How to test

1. **Round 1 (Denied):** set the approved User to **None**, with only the HR module box ticked. Fill "User, right NOT ticked".
2. **Round 2 (Allowed):** set the approved User to **All**. Fill "User, right ticked".
3. **Round 3:** test Admin, then Superadmin.
4. Each right has 3 checks. The result is **Pass** only if all 3 are as expected:
   - **Menu / Screen:** the tab or screen is shown or hidden.
   - **Button:** the button for that right is shown (Allowed) or hidden (Denied).
   - **Server:** the request sent directly works (Allowed) or is refused (Denied).

Assumption: Superadmin and Admin are allowed all rights.

## A. Permission Matrix

| ID | Module | Right | Superadmin (Allowed) | Admin (Allowed) | User, right NOT ticked (Denied) | User, right ticked (Allowed) |
|---|---|---|---|---|---|---|
| PM3-01 | Human Resources | Add Job | Pass | Pass | Pass | Pass |
| PM3-02 | Human Resources | Edit Job | Pass | Pass | Pass | Pass |
| PM3-03 | Human Resources | Delete Job | Pass | Pass | Pass | Pass |
| PM3-04 | Human Resources | Add Department | Pass | Pass | Pass | Pass |
| PM3-05 | Human Resources | Edit Department | Pass | Pass | Pass | Pass |
| PM3-06 | Human Resources | Delete Department | Pass | Pass | Pass | Pass |
| PM3-07 | Human Resources | Add Employee | Pass | Pass | Pass | Pass |
| PM3-08 | Human Resources | Edit Employee | Pass | Pass | Pass | Pass |
| PM3-09 | Human Resources | Delete Employee | Pass | Pass | Pass | Pass |
| PM3-10 | Human Resources | View Job History | Pass | Pass | Pass | Pass |
| PM3-11 | Human Resources | Add Job History | Pass | Pass | Pass | Pass |
| PM3-12 | Human Resources | Edit Job History | Pass | Pass | Pass | Pass |
| PM3-13 | Human Resources | Delete Job History | Pass | Pass | Pass | Pass |

## B. Salary Visibility Checks

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-SV-01 | History button without the right | Untick View Job History for the User, open the Employees tab | History button is hidden | Works as expected | Pass |
| TC-SV-02 | Job history URL without the right | As the same User, paste the job history URL | Denied | Works as expected | Pass |
| TC-SV-03 | No salary in the server response | As the same User, open the employee page with F12 > Network and check the responses | No salary or job history data is in the responses | Works as expected | Pass |
| TC-SV-04 | Employee profile without the right | Open an employee profile as the same User | Timeline and salary are hidden; the rest of the profile is shown | Works as expected | Pass |
| TC-SV-05 | With the View Job History right | Tick View Job History, log in as the User | Job history and salary are shown | Works as expected | Pass |
| TC-SV-06 | View only, no write rights | Tick only View Job History | List is shown; Add, Edit and Delete buttons are hidden, and the server refuses direct writes | Works as expected | Pass |
| TC-SV-07 | Salary not in the employee list | As a User, look at the Employees list columns | No salary column | Works as expected | Pass |
| TC-SV-08 | Admin and Superadmin | Log in as Admin, then Superadmin, open a job history | Both see job history and salary | Works as expected | Pass |
| TC-SV-09 | Rights change takes effect | Tick, then untick View Job History, refresh or log in again each time | Salary appears after ticking and is hidden after unticking | Works as expected | Pass |

## C. HR Rights Checks

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-HR-01 | HR module needs the module right | Untick the HR module for the User, log in, paste the HR URL | Menu item hidden and the URL is denied | Works as expected | Pass |
| TC-HR-02 | Module only, no action rights | Tick only the HR module box, log in | Lists open, but no Add, Edit or Delete buttons | Works as expected | Pass |
| TC-HR-03 | Only Add Employee | Tick only Add Employee | Add works; Edit and Delete are hidden and refused by the server | Works as expected | Pass |
| TC-HR-04 | Only Edit Employee | Tick only Edit Employee | Edit works; Add and Delete are hidden and refused by the server | Works as expected | Pass |
| TC-HR-05 | Only Delete Employee | Tick only Delete Employee | Delete works; Add and Edit are hidden and refused by the server | Works as expected | Pass |
| TC-HR-06 | Delete buttons hidden without the right | Untick the three Delete rights (Job, Department, Employee) | Delete buttons are not shown on all three tabs | Works as expected | Pass |
| TC-HR-07 | Hidden button is not enough | As the User without Delete Job, send a direct delete request (F12 tools) | Server refuses it, job stays Active | Works as expected | Pass |
| TC-HR-08 | Restore is for Admin only | As a User with a Delete right, look for deleted rows | User does not see deleted rows or Restore | Works as expected | Pass |
