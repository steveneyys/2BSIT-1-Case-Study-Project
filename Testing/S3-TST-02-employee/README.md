# S3-TST-02 Test Cases: Employee

**System:** Hope ERP  **Sprint:** 3  **Tester:** Llabres

**Status values:** Pass, Fail, or Blocked.

**Two different "inactive" ideas:** Status (Active/Inactive) means the record was deleted from the system. Separation date means the employee left the company. They are not the same.

## A. List and Views

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-EMP-01 | Employee list opens (Admin) | Log in as Admin, open Human Resources, click the Employees tab | List shows employee number, name, gender, birth date, hire date and separation date, a History button on each row, and a + Add Employee button | Works as expected | Pass |
| TC-EMP-02 | Admin sees tabs, Status and Stamp | Log in as Admin, look at the list | Active / Inactive / All tabs with counts; Status and Stamp columns; deleted rows are shaded | Works as expected | Pass |
| TC-EMP-03 | User view is limited | Log in as an approved User with the HR module | Only active employees; no tabs, no Status or Stamp columns | Works as expected | Pass |
| TC-EMP-04 | User without the HR module | Log in as a User without it, look at the menu, then paste the HR URL | Menu item is not shown and the URL is denied | Works as expected | Pass |

## B. Search and Filter

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-EMP-05 | Search by name | Type part of a last name, then a first name | Only matching employees are shown as you type | Works as expected | Pass |
| TC-EMP-06 | Search by employee number | Type an employee number | Matching employee is shown | Works as expected | Pass |
| TC-EMP-07 | Search with no match | Type text that matches no employee | Empty list or a "no results" message, no error | Works as expected | Pass |
| TC-EMP-08 | Search is not case-sensitive | Search the same name in lower and upper case | Same results both times | Works as expected | Pass |
| TC-EMP-09 | User cannot find inactive employees | Log in as a User, search a deleted employee | Employee is not found | Works as expected | Pass |
| TC-EMP-10 | Tabs and counts | Log in as Admin, click Active, Inactive and All | Each tab shows the right rows; Active + Inactive equals All | Works as expected | Pass |
| TC-EMP-11 | Separated employee | Look at an employee that has a separation date | Separation date is shown, and the Status is still Active (unless deleted) | Works as expected | Pass |

## C. Add Employee

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-EMP-12 | Add with valid details | Click + Add Employee, fill in all fields, save | Employee is saved as Active and shown in the list | Works as expected | Pass |
| TC-EMP-13 | Stamp after Add | Add an employee, look at the Stamp (Admin) | CREATED, the user, and the date and time | Works as expected | Pass |
| TC-EMP-14 | Add with empty last name | Leave the last name blank, save | Error shown, nothing saved | Works as expected | Pass |
| TC-EMP-15 | Add with empty first name | Leave the first name blank, save | Error shown, nothing saved | Works as expected | Pass |
| TC-EMP-16 | Gender choices | Open the gender field | Only M and F can be chosen | Works as expected | Pass |
| TC-EMP-17 | Invalid gender on the server | Send a direct request with a gender other than M or F (F12 tools) | Server refuses it, nothing is saved | Works as expected | Pass |
| TC-EMP-18 | Name too long | Type a last or first name longer than 15 characters, save | Clear error message, no server error | Works as expected | Pass |
| TC-EMP-19 | Employee number already used | Use an existing employee number, save | Error says the number already exists | Works as expected | Pass |
| TC-EMP-20 | Hire date before birth date | Type a hire date earlier than the birth date, save | Rejected with a clear message. Check the team design if unsure | Works as expected | Pass |
| TC-EMP-21 | Separation date before hire date | Type a separation date earlier than the hire date, save | Rejected with a clear message | Works as expected | Pass |
| TC-EMP-22 | Separation date on or after hire date | Type a separation date after the hire date, save | Saved | Works as expected | Pass |

## D. Edit Employee

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-EMP-23 | Edit form shows current values | Click Edit on an employee | Form is filled with the employee's current data | Works as expected | Pass |
| TC-EMP-24 | Edit and save | Change the first name, save | Change is saved and the Stamp shows EDITED | Works as expected | Pass |
| TC-EMP-25 | Edit with empty name | Clear the last name, save | Error shown, old data is kept | Works as expected | Pass |
| TC-EMP-26 | Cancel an edit | Change a value, then cancel | No change is saved | Works as expected | Pass |
| TC-EMP-27 | Employee number cannot be changed | Open Edit, look at the employee number | Number is not editable. Check the team design if unsure | Works as expected | Pass |
| TC-EMP-28 | Add a separation date later | Edit an active employee and add a separation date | Saved; Status stays Active and the date is shown | Works as expected | Pass |

## E. Delete and Restore

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-EMP-29 | Delete asks for confirmation | Click Delete on an employee with no job history or sales | A confirm message is shown | Works as expected | Pass |
| TC-EMP-30 | Delete is a soft delete | Confirm the delete, then check the row | Status Inactive, row shaded, Stamp DELETED, and the row is still in the database | Works as expected | Pass |
| TC-EMP-31 | Delete does not set a separation date | Delete an employee that has no separation date | Separation date stays empty | Works as expected | Pass |
| TC-EMP-32 | User cannot see a deleted employee | Log in as a User, look at the list and search | Employee is not shown or found | Works as expected | Pass |
| TC-EMP-33 | Restore an employee | Click Restore on the deleted employee | Employee is Active again | Works as expected | Pass |
| TC-EMP-34 | Delete blocked by active children | Try to delete an employee that has active job history or sales | Delete is refused with a clear message, employee stays Active. Check with the DB Admin which children block it | Works as expected | Pass |
| TC-EMP-35 | Blocked delete on the server | Send a direct delete request for the employee in TC-EMP-34 (F12 tools) | Server refuses it, nothing changes | Works as expected | Pass |

## F. Safety

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-EMP-36 | Special characters in a name | Add an employee with the last name `<b>Test</b>` | Shown as plain text, not as bold or code | Works as expected | Pass |
| TC-EMP-37 | Add or Edit without login | Log out, then send an Add or Edit request directly (F12 tools) | Request is refused, nothing is saved | Works as expected | Pass |
