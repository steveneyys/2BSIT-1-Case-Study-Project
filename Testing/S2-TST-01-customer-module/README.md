# S2-TST-01 Test Cases: Customer Module

**System:** Hope ERP  **Sprint:** 2  **Tester:** Llabres  **Date tested:** 2026-11-12

**Status values:** Pass, Fail, or Blocked.

## A. List and Views

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-CUS-01 | Customer list opens (Admin) | Log in as Admin, open Customer Management | List shows customers with number, name, address and pay terms, and a + Add Customer button | As expected | Pass |
| TC-CUS-02 | Admin sees status tabs | Log in as Admin, look above the list | Tabs Active, Inactive and All are shown, each with a count | As expected | Pass |
| TC-CUS-03 | Admin sees Status and Stamp | Log in as Admin, look at the columns and any deleted row | Status and Stamp columns are shown; deleted rows are shaded | As expected | Pass |
| TC-CUS-04 | User view is limited | Log in as an approved User with the Customer module | No status tabs, no Status or Stamp columns, no inactive rows | As expected | Pass |
| TC-CUS-05 | User without the Customer module | Log in as a User without the Customer module, look at the menu, then paste the Customer URL | Menu item is not shown and the URL is denied | As expected | Pass |

## B. Search and Filter

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-CUS-06 | Search by customer name | Type part of a customer name in the search box | List shows only matching customers as you type | As expected | Pass |
| TC-CUS-07 | Search by customer number | Type a customer number, for example C-001 | List shows the matching customer | As expected | Pass |
| TC-CUS-08 | Search is not case-sensitive | Search the same name in lower case and in upper case | Same results both times | As expected | Pass |
| TC-CUS-09 | Search with no match | Type text that matches no customer | Empty list or a "no results" message, no error | As expected | Pass |
| TC-CUS-10 | Clear the search | Search, then clear the search box | Full list is shown again | As expected | Pass |
| TC-CUS-11 | Active tab | Log in as Admin, click the Active tab | Only active customers are shown | As expected | Pass |
| TC-CUS-12 | Inactive tab | Log in as Admin, click the Inactive tab | Only deleted (inactive) customers are shown | As expected | Pass |
| TC-CUS-13 | All tab and counts | Log in as Admin, click the All tab and compare the counts | All customers are shown; Active + Inactive equals All | As expected | Pass |
| TC-CUS-14 | Search together with a tab | Log in as Admin, click Inactive, then search a name | Only inactive customers matching the name are shown | As expected | Pass |
| TC-CUS-15 | User cannot find inactive customers | Log in as a User, search the name of an inactive customer | Customer is not found | As expected | Pass |

## C. Add Customer

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-CUS-16 | Add with valid details | Click + Add Customer, fill in name, address and pay terms, save | Customer is saved with a customer number, status Active, and shown in the list | As expected | Pass |
| TC-CUS-17 | Stamp after Add | Add a customer, look at the Stamp column (Admin) | Stamp shows CREATED, the user and the date and time | As expected | Pass |
| TC-CUS-18 | Add with name only | Fill in only the customer name, save | Customer is saved (address and pay terms are optional) | As expected | Pass |
| TC-CUS-19 | Add with empty name | Leave the customer name blank, save | Error shown, no customer created | As expected | Pass |
| TC-CUS-20 | Add with a name that is too long | Type a name longer than 100 characters, save | Clear error message, no server error | As expected | Pass |
| TC-CUS-21 | Pay terms choices | Open the pay terms field | Net 30, COD and Prepaid can be chosen, and the chosen value is saved | As expected | Pass |
| TC-CUS-22 | Invalid pay terms on the server | Send a direct request with a pay terms value that is not in the list (F12 tools) | Server refuses it, nothing is saved | As expected | Pass |

## D. Edit Customer

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-CUS-23 | Edit form shows current values | Click Edit on a customer | Form is filled with the customer's current data | As expected | Pass |
| TC-CUS-24 | Edit and save | Change the address, save | Change is saved and shown in the list | As expected | Pass |
| TC-CUS-25 | Stamp after Edit | Edit a customer, look at the Stamp column (Admin) | Stamp shows EDITED, the user and the date and time | As expected | Pass |
| TC-CUS-26 | Edit with empty name | Clear the name, save | Error shown, old data is kept | As expected | Pass |
| TC-CUS-27 | Cancel an edit | Change a value, then cancel | No change is saved | As expected | Pass |
| TC-CUS-28 | Customer number cannot be changed | Open Edit, look at the customer number | Number is not editable | As expected | Pass |

## E. Safety

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-CUS-29 | Special characters in a name | Add a customer named `<b>Test</b> & "Co"` | Shown as plain text, not as bold or code, and saved correctly | As expected | Pass |
| TC-CUS-30 | Add or Edit without login | Log out, then send an Add or Edit request directly (F12 tools or pasted URL) | Request is refused, nothing is saved | As expected | Pass |

**Summary:** 30 test cases, 30 Pass, 0 Fail, 0 Blocked.
