# Sprint 1 Test Plan: Hope ERP

| | |
|---|---|
| **Task** | S1-TST-01 Sprint 1 test plan and acceptance criteria |
| **Prepared by** | Llabres (Tester) |
| **Sprint** | 1 |

## 1. Purpose

To check that the Sprint 1 features of Hope ERP work correctly and follow the user rights.

## 2. Scope

**In scope**

- Register
- Login and logout
- Set and reset password
- User Management
- Permissions (Superadmin / Admin / User)
- Smoke test

**Out of scope**

- Features planned for later sprints

## 3. Test Accounts

| Role | Email | Status |
|---|---|---|
| Superadmin | acestevenalcantara@gmail.com | Active |
| Admin | besamatthew504@gmail.com | Active |
| User | danjewelgala25@gmail.com | Registered, not yet approved |
| User | lem.llabres1107@gmail.com | Registered and approved |

## 4. Test Approach

| Task | What is tested | How | Deliverable |
|---|---|---|---|
| S1-TST-02 | Register, login/logout, set and reset password (including expired and reused tokens) | Manual test cases | `S1-TST-02_Test_Cases.xlsx` |
| S1-TST-03 | User Management: add, edit, block/unblock, approve, designate Admin, Admin cannot see or edit Superadmin, last-Superadmin guard | Manual test cases | `S1-TST-03_Test_Cases.xlsx` |
| S1-TST-04 | Permission matrix: Superadmin / Admin / User for each right, on the menu, buttons and server | Manual tests with registered and approved test accounts | `S1-TST-04_Permission_Matrix.xlsx` |
| S1-TST-05 | Login page and main page | Automated smoke test (JavaScript, Node.js) | `smoke-test.js` |
| S1-TST-06 | Bugs found in the tests above | Bug reports, then re-test after the fix | `S1-TST-06_Bug_Reports.xlsx` |

**Result values:** Pass, Fail, or Blocked. Blocked is used only when the screen is not built yet, and the reason is written in Remarks.

## 5. Environment

| Item | Value |
|---|---|
| Browser | Chrome |
| Link | localhost |
| Database | Supabase |

## 6. Roles

| Role | Name |
|---|---|
| Tester | Llabres |
| Developer | Alcantara |
| DB Admin | Besa |
| UI/UX Designer | Gala |
| Scrum Master | Alcantara |

## 7. Acceptance Criteria

- All test cases are executed and recorded as Pass or Fail (Blocked only if the screen is not built yet, with a reason)
- 100% of permission matrix checks pass
- Expired and reused reset tokens are rejected
- Admin cannot see or edit the Superadmin
- The last Superadmin cannot be removed or blocked
- The smoke test passes
- No open Critical or High bugs at the end of the sprint
