# S1-TST-03 Test Cases: User Management

**System:** Hope ERP  **Sprint:** 1  **Tester:** Llabres

**Status values:** Pass, Fail, or Blocked. Leave Actual Result and Status empty until the test is really run.

**Test accounts to use:** Superadmin, Admin, approved User, pending User (see the Sprint 1 Test Plan).

## A. View User List

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-UM-01 | Superadmin opens User Management | Log in as Superadmin, open User Management | List shows all users, including Admins and Superadmins | | |
| TC-UM-02 | Admin opens User Management | Log in as Admin, open User Management | List shows Users and other Admins (other Admin rows show "—" in Actions); no Superadmin accounts | | |
| TC-UM-03 | Normal user tries to open User Management | Log in as an approved User, click the menu, then paste the User Management URL | Menu item is not shown and the URL is denied | | |

## B. Add User

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-UM-04 | Add a user with valid details | Click Add User, fill in all fields, save | User is created and shown in the list | | |
| TC-UM-05 | Add a user with an empty required field | Click Add User, leave one required field blank, save | Error shown, no user created | | |
| TC-UM-06 | Add a user with an email already used | Click Add User, use an existing email, save | Error says email already exists | | |
| TC-UM-07 | New user sets a first password | Open the one-time set-password link of the new user, set a password, log in | Password is saved and the user can log in | | |

## C. Edit User

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-UM-08 | Edit a user's details | Click Edit on a user, change the name, save | Change is saved and shown in the list | | |
| TC-UM-09 | Edit with invalid data | Click Edit, clear a required field or type an invalid email, save | Error shown, old data is kept | | |

## D. Block and Unblock

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-UM-10 | Block an active user | Click Block on an active user | Status changes to Blocked | | |
| TC-UM-11 | Blocked user tries to log in | Log in as the blocked user | Login is refused | | |
| TC-UM-12 | Unblock a user | Click Unblock on the blocked user, then log in as that user | Status changes back to Active and login works | | |

## E. Approve

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-UM-13 | Superadmin sees pending users | Register a new user, log in as Superadmin, open User Management | New user is listed as Pending | | |
| TC-UM-14 | Superadmin approves a pending user | Click Approve on the pending user, then log in as that user | Status changes to Approved and login works | | |
| TC-UM-15 | Admin tries to approve a pending user | Log in as Admin, look for Approve, then try a direct request | Not allowed (only Superadmin approves). Check the team design if unsure | | |

## F. Designate Admin

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-UM-16 | Superadmin designates an Admin | Open an approved user, set the role to Admin, save, then log in as that user | Role is Admin and the user gets Admin screens | | |
| TC-UM-17 | Admin tries to designate another Admin | Log in as Admin, try to change a user's role to Admin (screen and direct request) | Not allowed (only Superadmin designates). Check the team design if unsure | | |

## G. Admin vs Superadmin

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-UM-18 | Admin cannot see a Superadmin | Log in as Admin, search the Superadmin's name or email in the list | Superadmin does not appear in the list or search | | |
| TC-UM-19 | Admin cannot edit a Superadmin | Log in as Admin, paste the edit URL or send an edit request for a Superadmin | Request is denied, no change is made | | |
| TC-UM-20 | Admin cannot block a Superadmin | Log in as Admin, send a block request for a Superadmin | Request is denied, Superadmin stays Active | | |
| TC-UM-21 | Admin cannot edit or block another Admin | Log in as Admin, look at another Admin's row, then send an edit or block request for that Admin | Actions shows "—", request is denied, no change is made | | |

## H. Last-Superadmin Guard

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-UM-22 | Block one Superadmin when there are two or more | Make sure 2 Superadmins exist, block one | Allowed, one Superadmin is still active | | |
| TC-UM-23 | Block the last remaining Superadmin | With only one active Superadmin, try to block that account | Refused with a message, account stays Active | | |
| TC-UM-24 | Remove or demote the last Superadmin | With only one active Superadmin, try to delete it or change its role | Refused with a message, role stays Superadmin | | |
| TC-UM-25 | Guard works on the server | With only one active Superadmin, send a direct block request (not through the button) | Server refuses the request | | |
