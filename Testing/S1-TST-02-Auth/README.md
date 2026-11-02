# S1-TST-02 Test Cases: Register, Login/Logout, Set and Reset Password

**System:** Hope ERP  **Sprint:** 1  **Tester:** Llabres  **Date tested:** 2026-11-02

**Status values:** Pass, Fail, or Blocked.

## A. Register

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-REG-01 | Register with valid details | Open the register form, fill in all fields, submit | Account is created with status pending, success message shown | As expected | Pass |
| TC-REG-02 | Pending user tries to log in | Log in with the new account before approval | Login is not allowed (account not yet approved) | As expected | Pass |
| TC-REG-03 | Register with empty required field | Leave one required field blank, submit | Error message shown, no account created | As expected | Pass |
| TC-REG-04 | Register with an email already used | Use an existing email, submit | Error says email already exists | As expected | Pass |
| TC-REG-05 | Register with invalid email format | Type "abc" as email, submit | Error says invalid email | As expected | Pass |

## B. Login and Logout

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-LOG-01 | Login with correct credentials | Enter valid email and password | Goes to the main page | As expected | Pass |
| TC-LOG-02 | Login with wrong password | Enter valid email, wrong password | Error shown, stays on login page | As expected | Pass |
| TC-LOG-03 | Login with unknown email | Enter an email that is not registered | Error shown, stays on login page | As expected | Pass |
| TC-LOG-04 | Blocked user cannot sign in | Block a user, then log in as that user | Login is refused | As expected | Pass |
| TC-LOG-05 | Logout | Click Logout | Session ends, goes to login page | As expected | Pass |
| TC-LOG-06 | Back button after logout | Logout, then press the browser Back button | Protected page is not shown, asks for login | As expected | Pass |
| TC-LOG-07 | Open main page without login | Paste the main page URL in a new browser window | Redirected to login | As expected | Pass |

## C. Set Password (first login)

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-SET-01 | Set password with the one-time link | Open the set-password link, enter a valid new password | Password saved, can log in with it | As expected | Pass |
| TC-SET-02 | Passwords do not match | Enter different values in password and confirm | Error shown, password not saved | As expected | Pass |
| TC-SET-03 | Reuse the set-password link | Open the same link again after using it | Link is rejected | As expected | Pass |

## D. Reset Password

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-RST-01 | Request reset with registered email | Click Forgot Password, enter email | Reset email with token link is sent | As expected | Pass |
| TC-RST-02 | Request reset with unknown email | Enter an email that is not registered | No reset is sent, message does not show if the email exists | As expected | Pass |
| TC-RST-03 | Reset with a valid token | Open the link, enter a new password | Password changed, can log in with the new one | As expected | Pass |
| TC-RST-04 | Expired token | Open a link after the token expiry time | Rejected, shows expired message | As expected | Pass |
| TC-RST-05 | Reused token | Use the link to reset once, then open it again | Rejected, shows invalid or used message | As expected | Pass |
| TC-RST-06 | Old password after reset | Try to log in with the old password | Login fails | As expected | Pass |

**Summary:** 21 test cases, 21 Pass, 0 Fail, 0 Blocked.
