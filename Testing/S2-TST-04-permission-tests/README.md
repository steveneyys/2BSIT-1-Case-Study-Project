# S2-TST-04 Per-Right Permission Tests: Customer and Product

**System:** Hope ERP  **Sprint:** 2  **Tester:** Llabres  **Date tested:** 2026-11-12

**Rights tested (9):** Add, Edit, Delete Customer; Add, Edit, Delete Product; Add, Edit, Delete Price (from Student Guide section 3.8).

**Result values:** Pass, Fail, or Blocked.

## How it was tested

1. **Round 1 (Denied):** the approved User was set to **None**, with the Customer and Product module boxes ticked. Column "User, right NOT ticked" was filled.
2. **Round 2 (Allowed):** the approved User was set to **All**. Column "User, right ticked" was filled.
3. **Round 3:** Admin, then Superadmin were tested.
4. Each right has 3 checks. The result is **Pass** only if all 3 are as expected:
   - **Menu / Screen:** the module screen is shown or hidden.
   - **Button:** the button for that right is shown (Allowed) or hidden (Denied).
   - **Server:** the request sent directly works (Allowed) or is refused (Denied).

Assumption used: Superadmin and Admin are allowed all rights.

## A. Permission Matrix

| ID | Module | Right | Superadmin (Allowed) | Admin (Allowed) | User, right NOT ticked (Denied) | User, right ticked (Allowed) |
|---|---|---|---|---|---|---|
| PM2-01 | Customer | Add Customer | Pass | Pass | Pass | Pass |
| PM2-02 | Customer | Edit Customer | Pass | Pass | Pass | Pass |
| PM2-03 | Customer | Delete Customer | Pass | Pass | Pass | Pass |
| PM2-04 | Product | Add Product | Pass | Pass | Pass | Pass |
| PM2-05 | Product | Edit Product | Pass | Pass | Pass | Pass |
| PM2-06 | Product | Delete Product | Pass | Pass | Pass | Pass |
| PM2-07 | Product | Add Price | Pass | Pass | Pass | Pass |
| PM2-08 | Product | Edit Price | Pass | Pass | Pass | Pass |
| PM2-09 | Product | Delete Price | Pass | Pass | Pass | Pass |

**Matrix summary:** 9 rights x 4 = 36 results, 36 Pass, 0 Fail, 0 Blocked.

## B. Role Checks

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-PR-01 | Customer module needs the module right | Untick the Customer module for the User, log in, paste the Customer URL | Menu item hidden and the URL is denied | As expected | Pass |
| TC-PR-02 | Product module needs the module right | Untick the Product module for the User, log in, paste the Product URL | Menu item hidden and the URL is denied | As expected | Pass |
| TC-PR-03 | Module only, no action rights | Tick only the Customer module box, log in | List opens, but no Add, Edit or Delete buttons | As expected | Pass |
| TC-PR-04 | Only Add Customer | Tick only Add Customer | Add works; Edit and Delete are hidden and refused by the server | As expected | Pass |
| TC-PR-05 | Only Edit Customer | Tick only Edit Customer | Edit works; Add and Delete are hidden and refused by the server | As expected | Pass |
| TC-PR-06 | Only Delete Customer | Tick only Delete Customer | Delete works; Add and Edit are hidden and refused by the server | As expected | Pass |
| TC-PR-07 | Only Add Price | Tick only the Product module and Add Price | A price can be added; Edit Price and Delete Price are hidden and refused | As expected | Pass |
| TC-PR-08 | Delete buttons hidden without the right | Untick Delete Customer and Delete Product, log in as the User | Delete buttons are not shown on both screens | As expected | Pass |
| TC-PR-09 | Price buttons without price rights | Untick all three price rights, open the Product screen | Price buttons for Add, Edit and Delete Price are hidden | As expected | Pass |
| TC-PR-10 | Hidden button is not enough | As the User without Delete Product, send a direct delete request (F12 tools) | Server refuses it, product stays Active | As expected | Pass |
| TC-PR-11 | Rights change takes effect | Change the User's rights, then refresh or log in again | Buttons and actions follow the new rights | As expected | Pass |
| TC-PR-12 | Restore needs the right | As a User with Delete Customer ticked, look for deleted rows | User does not see deleted rows or Restore (Admin only) | As expected | Pass |

**Role Checks summary:** 12 checks, 12 Pass, 0 Fail, 0 Blocked.
