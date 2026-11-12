# S2-TST-05 Regression Test of Sprint 1

**System:** Hope ERP  **Sprint:** 2  **Tester:** Llabres  **Date tested:** 2026-11-12

**Purpose:** To check that the Sprint 2 changes did not break the Sprint 1 features. The Sprint 1 test cases were run again.

**Result values:** Pass, Fail, or Blocked.

## A. Sprint 1 Test Cases Run Again

| Area | Test cases | Count | Result | Remarks |
|---|---|---|---|---|
| Register | TC-REG-01 to TC-REG-05 | 5 | Pass | No change from Sprint 1 |
| Login and Logout | TC-LOG-01 to TC-LOG-07 | 7 | Pass | No change from Sprint 1 |
| Set Password | TC-SET-01 to TC-SET-03 | 3 | Pass | No change from Sprint 1 |
| Reset Password | TC-RST-01 to TC-RST-06 | 6 | Pass | No change from Sprint 1 |
| User Management: list, add, edit | TC-UM-01 to TC-UM-09 | 9 | Pass | No change from Sprint 1 |
| User Management: block, approve, designate Admin | TC-UM-10 to TC-UM-17 | 8 | Pass | No change from Sprint 1 |
| Admin vs Superadmin, last-Superadmin guard | TC-UM-18 to TC-UM-25 | 8 | Pass | No change from Sprint 1 |
| Permission matrix (36 rights) | PM-01 to PM-36 | 36 | Pass | No change from Sprint 1 |
| Role checks (menus, Rights dialog) | RC-01 to RC-24 | 24 | Pass | No change from Sprint 1 |
| Smoke test | 5 checks in `smoke-test.js` | 5 | Pass | 5 of 5 checks passed |

## B. New Checks for Sprint 2 Changes

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| RG-01 | Customer and Product tiles open | Log in as Admin, click the Customer and Product tiles on the main page | Each opens its screen | As expected | Pass |
| RG-02 | Menu still follows the role | Log in as Superadmin, Admin and User, compare the sidebars | Same as Sprint 1, plus the Customer and Product screens where allowed | As expected | Pass |
| RG-03 | Customer and Product rights now work | Tick and untick Customer and Product rights in the Rights dialog, then test | Rights are applied on the new screens | As expected | Pass |
| RG-04 | Rights change still logged | Change a right, then check audit_log | A new row shows who, which user, which right, and when | As expected | Pass |
| RG-05 | Sprint 1 accounts still work | Log in with the Superadmin, Admin and approved User test accounts | All can log in as before | As expected | Pass |
| RG-06 | Pending and blocked users still refused | Try to log in with the pending and a blocked account | Login refused | As expected | Pass |
| RG-07 | Smoke test still passes | Run `node smoke-test.js` | All checks pass | As expected | Pass |

**Summary:** 118 checks run (111 from Sprint 1 and 7 new), 118 Pass, 0 Fail, 0 Blocked.
