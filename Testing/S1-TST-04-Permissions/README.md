# S1-TST-04 Permission Matrix Tests

**System:** Hope ERP  **Sprint:** 1  **Tester:** Llabres  **Date tested:** 2026-11-02

**Source:** Hope, Inc. ERP Student Guide, section 3.8 (36 rights) and section 1.2 (roles).

**Result values:** Pass, Fail, or Blocked.

## How it was tested

1. **Round 1 (Denied):** the approved User was set to **None** in the Rights dialog. Column "User, right NOT ticked" was filled.
2. **Round 2 (Allowed):** the approved User was set to **All**. Column "User, right ticked" was filled.
3. **Round 3:** Admin, then Superadmin were tested.
4. Each right has 3 checks. The result is **Pass** only if all 3 are as expected:
   - **Menu:** the menu item, tile or screen is shown (Allowed) or hidden (Denied).
   - **Button:** the button, link, tab or section is shown (Allowed) or hidden (Denied).
   - **Server:** the request sent directly works (Allowed) or is refused (Denied).

Assumption used: Superadmin and Admin are allowed all 36 rights.

## A. Permission Matrix (36 rights)

| ID | Module | Right | Superadmin (Allowed) | Admin (Allowed) | User, right NOT ticked (Denied) | User, right ticked (Allowed) |
|---|---|---|---|---|---|---|
| PM-01 | Customer | Add Customer | Pass | Pass | Pass | Pass |
| PM-02 | Customer | Edit Customer | Pass | Pass | Pass | Pass |
| PM-03 | Customer | Delete Customer | Pass | Pass | Pass | Pass |
| PM-04 | Product | Add Product | Pass | Pass | Pass | Pass |
| PM-05 | Product | Edit Product | Pass | Pass | Pass | Pass |
| PM-06 | Product | Delete Product | Pass | Pass | Pass | Pass |
| PM-07 | Product | Add Price | Pass | Pass | Pass | Pass |
| PM-08 | Product | Edit Price | Pass | Pass | Pass | Pass |
| PM-09 | Product | Delete Price | Pass | Pass | Pass | Pass |
| PM-10 | Human Resources | Add Job | Pass | Pass | Pass | Pass |
| PM-11 | Human Resources | Edit Job | Pass | Pass | Pass | Pass |
| PM-12 | Human Resources | Delete Job | Pass | Pass | Pass | Pass |
| PM-13 | Human Resources | Add Department | Pass | Pass | Pass | Pass |
| PM-14 | Human Resources | Edit Department | Pass | Pass | Pass | Pass |
| PM-15 | Human Resources | Delete Department | Pass | Pass | Pass | Pass |
| PM-16 | Human Resources | Add Employee | Pass | Pass | Pass | Pass |
| PM-17 | Human Resources | Edit Employee | Pass | Pass | Pass | Pass |
| PM-18 | Human Resources | Delete Employee | Pass | Pass | Pass | Pass |
| PM-19 | Human Resources | View Job History | Pass | Pass | Pass | Pass |
| PM-20 | Human Resources | Add Job History | Pass | Pass | Pass | Pass |
| PM-21 | Human Resources | Edit Job History | Pass | Pass | Pass | Pass |
| PM-22 | Human Resources | Delete Job History | Pass | Pass | Pass | Pass |
| PM-23 | Sales | Add Sale | Pass | Pass | Pass | Pass |
| PM-24 | Sales | Edit Sale | Pass | Pass | Pass | Pass |
| PM-25 | Sales | Delete Sale | Pass | Pass | Pass | Pass |
| PM-26 | Sales | View Sale Detail | Pass | Pass | Pass | Pass |
| PM-27 | Sales | Add Sale Detail | Pass | Pass | Pass | Pass |
| PM-28 | Sales | Edit Sale Detail | Pass | Pass | Pass | Pass |
| PM-29 | Sales | Delete Sale Detail | Pass | Pass | Pass | Pass |
| PM-30 | Reports | Report: Top Customers | Pass | Pass | Pass | Pass |
| PM-31 | Reports | Report: Product Master List | Pass | Pass | Pass | Pass |
| PM-32 | Reports | Report: Top Products | Pass | Pass | Pass | Pass |
| PM-33 | Reports | Report: Active Employees | Pass | Pass | Pass | Pass |
| PM-34 | Reports | Report: All Employees | Pass | Pass | Pass | Pass |
| PM-35 | Reports | Report: Employee Job History | Pass | Pass | Pass | Pass |
| PM-36 | Reports | Report: Top Sales | Pass | Pass | Pass | Pass |

**Matrix summary:** 36 rights x 4 = 144 results, 144 Pass, 0 Fail, 0 Blocked.

## B. Role Checks

| ID | Category | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| RC-01 | Menu by Role | Superadmin menu | Log in as Superadmin, look at the sidebar and main page | Full menu: all modules, User Management and System Settings | As expected | Pass |
| RC-02 | Menu by Role | Admin menu | Log in as Admin, look at the sidebar and main page | All modules and User Management; no System Settings or Superadmin powers | As expected | Pass |
| RC-03 | Menu by Role | User with no rights | Set the User to None, log in as that User | No module can be used (greyed out or hidden); no User Management | As expected | Pass |
| RC-04 | Menu by Role | User with one module | Tick only the Customer module for the User, log in again | Only Customer is available; the other modules are greyed out or hidden | As expected | Pass |
| RC-05 | Menu by Role | Admin cannot open System Settings | Log in as Admin, paste the System Settings URL | Denied | As expected | Pass |
| RC-06 | Row and Column Visibility | Superadmin/Admin see deleted rows and Status/Stamp | Log in as Admin, open the first module screen that is built | Deleted rows are shown and shaded; Status and Stamp columns appear | As expected | Pass |
| RC-07 | Row and Column Visibility | User sees active rows only | Log in as the User, open the same module screen | No deleted rows, no Status or Stamp columns | As expected | Pass |
| RC-08 | Account State | Pending account cannot get in | Log in as the registered, not approved User, then paste the main page and a module URL | Login refused; direct URLs go to the login page | As expected | Pass |
| RC-09 | Account State | Blocked user cannot get in even with rights | Give the User All rights, block the User, then try to log in | Login refused | As expected | Pass |
| RC-10 | Rights Dialog | Admin opens the Rights dialog for a User | Log in as Admin, click Rights on the User | Dialog shows 5 modules with 36 checkboxes grouped by module | As expected | Pass |
| RC-11 | Rights Dialog | Module box switches the module on | Tick only the Sales module box (no action boxes), save, log in as the User | Sales is available, but Add, Edit, Delete Sale are not allowed | As expected | Pass |
| RC-12 | Rights Dialog | All and None shortcuts | Click All, check the boxes, then click None, check again | All ticks all 36 boxes; None clears all 36 | As expected | Pass |
| RC-13 | Rights Dialog | Saved rights are kept | Tick some boxes, save, close, open the dialog again | The same boxes are still ticked | As expected | Pass |
| RC-14 | Rights Dialog | Untick removes the right | Untick Add Customer, save, then try the Add Customer action as the User | Add Customer is no longer allowed (button hidden and server refuses) | As expected | Pass |
| RC-15 | Rights Dialog | Rights change is logged | Change a right, save, then check audit_log | A new row shows who changed it, for which user, which right, and when | As expected | Pass |
| RC-16 | Rights Dialog | Admin cannot open Rights for Superadmin or other Admin | Log in as Admin, look at those rows, then try a direct request | Actions shows "—" and the request is denied | As expected | Pass |
| RC-17 | Rights Dialog | Normal user cannot open the Rights dialog | Log in as the User, look for Rights, then try a direct request | No Rights option; the request is denied | As expected | Pass |
| RC-18 | Rights Dialog | Superadmin opens the Rights dialog for a User | Log in as Superadmin, click Rights on the User | Dialog opens and saves | As expected | Pass |
| RC-19 | Isolation (only one right ticked) | Only Add Customer | Set None, tick only Add Customer, save, try all Customer, Product and other rights as the User | Add Customer is allowed; every other right is denied | As expected | Pass |
| RC-20 | Isolation (only one right ticked) | Only Edit Product | Set None, tick only Edit Product, save, try all rights as the User | Edit Product is allowed; every other right is denied | As expected | Pass |
| RC-21 | Isolation (only one right ticked) | Only View Job History | Set None, tick only View Job History, save, try all rights as the User | View Job History is allowed; every other right is denied | As expected | Pass |
| RC-22 | Isolation (only one right ticked) | Only View Sale Detail | Set None, tick only View Sale Detail, save, try all rights as the User | View Sale Detail is allowed; every other right is denied | As expected | Pass |
| RC-23 | Isolation (only one right ticked) | Only one report | Set None, tick only Report: Top Sales, save, try all 7 reports as the User | Top Sales opens; the other 6 reports are denied | As expected | Pass |
| RC-24 | Rights Take Effect | Change is applied to the user | Change the User's rights, then refresh or log in again as the User | Menu and actions follow the new rights | As expected | Pass |

**Role Checks summary:** 24 checks, 24 Pass, 0 Fail, 0 Blocked.
