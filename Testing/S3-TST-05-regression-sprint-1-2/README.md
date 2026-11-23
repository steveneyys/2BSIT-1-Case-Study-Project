# S3-TST-05 Regression Test of Sprints 1-2

**System:** Hope ERP  **Sprint:** 3  **Tester:** Llabres

**Purpose:** To check that the Sprint 3 changes did not break the Sprint 1 and Sprint 2 features. The earlier test cases are run again and the new result is recorded.

**Result values:** Pass, Fail, or Blocked.

## A. Sprint 1 Test Cases Run Again

| Area | Test cases | Count | Result | Remarks |
|---|---|---|---|---|
| Register | TC-REG-01 to TC-REG-05 | 5 | Pass | All passed |
| Login and Logout | TC-LOG-01 to TC-LOG-07 | 7 | Pass | All passed |
| Set Password | TC-SET-01 to TC-SET-03 | 3 | Pass | All passed |
| Reset Password | TC-RST-01 to TC-RST-06 | 6 | Pass | All passed |
| User Management: list, add, edit | TC-UM-01 to TC-UM-09 | 9 | Pass | All passed |
| User Management: block, approve, designate Admin | TC-UM-10 to TC-UM-17 | 8 | Pass | All passed |
| Admin vs Superadmin, last-Superadmin guard | TC-UM-18 to TC-UM-25 | 8 | Pass | All passed |
| Permission matrix (36 rights) | PM-01 to PM-36 | 36 | Pass | All passed |
| Role checks (menus, Rights dialog) | RC-01 to RC-24 | 24 | Pass | All passed |
| Smoke test | 5 checks in `smoke-test.js` | 5 | Pass | All passed |

## B. Sprint 2 Test Cases Run Again

| Area | Test cases | Count | Result | Remarks |
|---|---|---|---|---|
| Customer module | TC-CUS-01 to TC-CUS-30 | 30 | Pass | All passed |
| Product and price history | TC-PRD-01 to 17, TC-PRC-01 to 10, TC-CUR-01 to 05 | 32 | Pass | All passed |
| Soft delete and restore | TC-DEL-01 to TC-DEL-21 | 21 | Pass | All passed |
| Customer and product rights | PM2-01 to PM2-09 | 9 | Pass | All passed |
| Customer and product role checks | TC-PR-01 to TC-PR-12 | 12 | Pass | All passed |

## C. New Checks for Sprint 3 Changes

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| RG3-01 | Human Resources tile opens | Log in as Admin, click the Human Resources tile on the main page | Employees, Jobs and Departments tabs open | Works as expected | Pass |
| RG3-02 | Menu still follows the role | Log in as Superadmin, Admin and User, compare the sidebars | Same as before, plus Human Resources where allowed | Works as expected | Pass |
| RG3-03 | HR rights now work | Tick and untick HR rights in the Rights dialog, then test | Rights are applied on the HR screens | Works as expected | Pass |
| RG3-04 | Rights change still logged | Change a right, then check audit_log | A new row shows who, which user, which right, and when | Works as expected | Pass |
| RG3-05 | Customer and product demo data unchanged | Open the Customer and Product lists and a price history | Same data as before Sprint 3 | Works as expected | Pass |
| RG3-06 | User accounts still work after the employee link | Log in with the Superadmin, Admin and approved User test accounts, and open User Management | All can log in and the user list still shows correctly | Works as expected | Pass |
| RG3-07 | Soft delete still works on customer and product | Delete and restore one customer and one product | Same behaviour as in Sprint 2 | Works as expected | Pass |
| RG3-08 | Smoke test still passes | Run `node smoke-test.js` | All checks pass | Works as expected | Pass |

**Summary:** 223 checks run, 223 Pass, 0 Fail, 0 Blocked.
