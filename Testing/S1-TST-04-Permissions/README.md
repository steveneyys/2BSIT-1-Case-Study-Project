# S1-TST-04 Permission Matrix Tests

**System:** Hope ERP  **Sprint:** 1  **Tester:** Llabres

**Source:** Hope, Inc. ERP Student Guide, section 3.8 (36 rights) and section 1.2 (roles).

**Result values:** Pass, Fail, or Blocked. Leave empty until the test is really run.

## How to test

1. **Round 1 (Denied):** In the Rights dialog, set the approved User to **None** and save. Fill the column "User, right NOT ticked".
2. **Round 2 (Allowed):** Set the approved User to **All** and save. Fill the column "User, right ticked".
3. **Round 3:** Log in as Admin, then as Superadmin. Fill their columns.
4. For each right, do 3 checks. The result is **Pass** only if all 3 are as expected:
   - **Menu:** the menu item, tile or screen is shown (Allowed) or hidden (Denied).
   - **Button:** the button, link, tab or section for that right is shown (Allowed) or hidden (Denied).
   - **Server:** send the request directly (paste the URL or use the browser developer tools, F12). It works (Allowed) or is refused (Denied). Hiding a button is not enough, the server must refuse.

**Notes**
- Assumption: Superadmin and Admin are allowed all 36 rights. Confirm with the team lead.
- In Sprint 1, only the Rights dialog, main page and permission check are planned. The Customer, Product, HR, Sales and Reports screens come in Sprints 2 to 4. Mark those checks **Blocked** until the screen exists, then run them again.

## A. Permission Matrix (36 rights)

| ID | Module | Right | Superadmin (Allowed) | Admin (Allowed) | User, right NOT ticked (Denied) | User, right ticked (Allowed) |
|---|---|---|---|---|---|---|
| PM-01 | Customer | Add Customer | | | | |
| PM-02 | Customer | Edit Customer | | | | |
| PM-03 | Customer | Delete Customer | | | | |
| PM-04 | Product | Add Product | | | | |
| PM-05 | Product | Edit Product | | | | |
| PM-06 | Product | Delete Product | | | | |
| PM-07 | Product | Add Price | | | | |
| PM-08 | Product | Edit Price | | | | |
| PM-09 | Product | Delete Price | | | | |
| PM-10 | Human Resources | Add Job | | | | |
| PM-11 | Human Resources | Edit Job | | | | |
| PM-12 | Human Resources | Delete Job | | | | |
| PM-13 | Human Resources | Add Department | | | | |
| PM-14 | Human Resources | Edit Department | | | | |
| PM-15 | Human Resources | Delete Department | | | | |
| PM-16 | Human Resources | Add Employee | | | | |
| PM-17 | Human Resources | Edit Employee | | | | |
| PM-18 | Human Resources | Delete Employee | | | | |
| PM-19 | Human Resources | View Job History | | | | |
| PM-20 | Human Resources | Add Job History | | | | |
| PM-21 | Human Resources | Edit Job History | | | | |
| PM-22 | Human Resources | Delete Job History | | | | |
| PM-23 | Sales | Add Sale | | | | |
| PM-24 | Sales | Edit Sale | | | | |
| PM-25 | Sales | Delete Sale | | | | |
| PM-26 | Sales | View Sale Detail | | | | |
| PM-27 | Sales | Add Sale Detail | | | | |
| PM-28 | Sales | Edit Sale Detail | | | | |
| PM-29 | Sales | Delete Sale Detail | | | | |
| PM-30 | Reports | Report: Top Customers | | | | |
| PM-31 | Reports | Report: Product Master List | | | | |
| PM-32 | Reports | Report: Top Products | | | | |
| PM-33 | Reports | Report: Active Employees | | | | |
| PM-34 | Reports | Report: All Employees | | | | |
| PM-35 | Reports | Report: Employee Job History | | | | |
| PM-36 | Reports | Report: Top Sales | | | | |

## B. Role Checks

| ID | Category | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| RC-01 | Menu by Role | Superadmin menu | Log in as Superadmin, look at the sidebar and main page | Full menu: all modules, User Management and System Settings | | |
| RC-02 | Menu by Role | Admin menu | Log in as Admin, look at the sidebar and main page | All modules and User Management; no System Settings or Superadmin powers | | |
| RC-03 | Menu by Role | User with no rights | Set the User to None, log in as that User | No module can be used (greyed out or hidden); no User Management | | |
| RC-04 | Menu by Role | User with one module | Tick only the Customer module for the User, log in again | Only Customer is available; the other modules are greyed out or hidden | | |
| RC-05 | Menu by Role | Admin cannot open System Settings | Log in as Admin, paste the System Settings URL | Denied. Mark Blocked if System Settings is not built yet | | |
| RC-06 | Row and Column Visibility | Superadmin/Admin see deleted rows and Status/Stamp | Log in as Admin, open the first module screen that is built | Deleted rows are shown and shaded; Status and Stamp columns appear. Mark Blocked until a module screen exists (Sprint 2) | | |
| RC-07 | Row and Column Visibility | User sees active rows only | Log in as the User, open the same module screen | No deleted rows, no Status or Stamp columns. Mark Blocked until a module screen exists (Sprint 2) | | |
| RC-08 | Account State | Pending account cannot get in | Log in as the registered, not approved User, then paste the main page and a module URL | Login refused; direct URLs go to the login page | | |
| RC-09 | Account State | Blocked user cannot get in even with rights | Give the User All rights, block the User, then try to log in | Login refused | | |
| RC-10 | Rights Dialog | Admin opens the Rights dialog for a User | Log in as Admin, click Rights on the User | Dialog shows 5 modules with 36 checkboxes grouped by module | | |
| RC-11 | Rights Dialog | Module box switches the module on | Tick only the Sales module box (no action boxes), save, log in as the User | Sales is available, but Add, Edit, Delete Sale are not allowed | | |
| RC-12 | Rights Dialog | All and None shortcuts | Click All, check the boxes, then click None, check again | All ticks all 36 boxes; None clears all 36 | | |
| RC-13 | Rights Dialog | Saved rights are kept | Tick some boxes, save, close, open the dialog again | The same boxes are still ticked | | |
| RC-14 | Rights Dialog | Untick removes the right | Untick Add Customer, save, then try the Add Customer action as the User | Add Customer is no longer allowed (button hidden and server refuses) | | |
| RC-15 | Rights Dialog | Rights change is logged | Change a right, save, then check audit_log (ask the DB Admin or use the database tool) | A new row shows who changed it, for which user, which right, and when | | |
| RC-16 | Rights Dialog | Admin cannot open Rights for Superadmin or other Admin | Log in as Admin, look at those rows, then try a direct request | Actions shows "—" and the request is denied | | |
| RC-17 | Rights Dialog | Normal user cannot open the Rights dialog | Log in as the User, look for Rights, then try a direct request | No Rights option; the request is denied | | |
| RC-18 | Rights Dialog | Superadmin opens the Rights dialog for a User | Log in as Superadmin, click Rights on the User | Dialog opens and saves | | |
| RC-19 | Isolation (only one right ticked) | Only Add Customer | Set None, tick only Add Customer, save, try all Customer, Product and other rights as the User | Add Customer is allowed; every other right is denied | | |
| RC-20 | Isolation (only one right ticked) | Only Edit Product | Set None, tick only Edit Product, save, try all rights as the User | Edit Product is allowed; every other right is denied | | |
| RC-21 | Isolation (only one right ticked) | Only View Job History | Set None, tick only View Job History, save, try all rights as the User | View Job History is allowed; every other right is denied | | |
| RC-22 | Isolation (only one right ticked) | Only View Sale Detail | Set None, tick only View Sale Detail, save, try all rights as the User | View Sale Detail is allowed; every other right is denied | | |
| RC-23 | Isolation (only one right ticked) | Only one report | Set None, tick only Report: Top Sales, save, try all 7 reports as the User | Top Sales opens; the other 6 reports are denied | | |
| RC-24 | Rights Take Effect | Change is applied to the user | Change the User's rights, then refresh or log in again as the User | Menu and actions follow the new rights (check the team design if a new login is needed) | | |
