# S2-TST-02 Test Cases: Product and Price History

**System:** Hope ERP  **Sprint:** 2  **Tester:** Llabres  **Date tested:** 2026-11-12

**Status values:** Pass, Fail, or Blocked.

## A. Product List and Views

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-PRD-01 | Product list opens (Admin) | Log in as Admin, open Product Management | List shows code, description, unit and Current Price, a Prices button on each row, and a + Add Product button | As expected | Pass |
| TC-PRD-02 | Admin sees tabs, Status and Stamp | Log in as Admin, look at the list | Active / Inactive / All tabs with counts; Status and Stamp columns; deleted rows are shaded | As expected | Pass |
| TC-PRD-03 | User view is limited | Log in as an approved User with the Product module | Only active products; no tabs, no Status or Stamp columns | As expected | Pass |
| TC-PRD-04 | User without the Product module | Log in as a User without it, look at the menu, then paste the Product URL | Menu item is not shown and the URL is denied | As expected | Pass |

## B. Search

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-PRD-05 | Search by product code | Type a product code, for example P-001 | Matching product is shown | As expected | Pass |
| TC-PRD-06 | Search by description | Type part of a description | Only matching products are shown as you type | As expected | Pass |
| TC-PRD-07 | Search with no match | Type text that matches no product | Empty list or a "no results" message, no error | As expected | Pass |
| TC-PRD-08 | User cannot find inactive products | Log in as a User, search an inactive product | Product is not found | As expected | Pass |

## C. Add and Edit Product

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-PRD-09 | Add with valid details | Click + Add Product, fill in code, description and unit, save | Product is saved as Active and shown in the list | As expected | Pass |
| TC-PRD-10 | Stamp after Add | Add a product, look at the Stamp (Admin) | CREATED, the user, and the date and time | As expected | Pass |
| TC-PRD-11 | Add with empty description | Leave the description blank, save | Error shown, no product created | As expected | Pass |
| TC-PRD-12 | Add with a product code already used | Use an existing product code, save | Error says the code already exists | As expected | Pass |
| TC-PRD-13 | Invalid unit on the server | Send a direct request with a unit that is not allowed (F12 tools) | Server refuses it, nothing is saved | As expected | Pass |
| TC-PRD-14 | Edit and save | Click Edit, change the description, save | Change is saved and shown in the list | As expected | Pass |
| TC-PRD-15 | Stamp after Edit | Edit a product, look at the Stamp (Admin) | EDITED, the user, and the date and time | As expected | Pass |
| TC-PRD-16 | Edit with empty description | Clear the description, save | Error shown, old data is kept | As expected | Pass |
| TC-PRD-17 | Product code cannot be changed | Open Edit, look at the product code | Code is not editable | As expected | Pass |

## D. Price History

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-PRC-01 | Open the price history | Click Prices on a product (Admin) | Price history of that product opens, with price and effective date, plus Status and Stamp | As expected | Pass |
| TC-PRC-02 | User view of price history | Log in as a User, click Prices | Same list without Status and Stamp | As expected | Pass |
| TC-PRC-03 | Add a price | Add a price with an effective date, save | Price is saved and shown in the history | As expected | Pass |
| TC-PRC-04 | Add with empty price | Leave the price blank, save | Error shown, nothing saved | As expected | Pass |
| TC-PRC-05 | Add with zero or negative price | Type 0, then -5, save | Both are rejected with a clear message | As expected | Pass |
| TC-PRC-06 | Add with a non-number price | Type "abc" as the price, save | Rejected with a clear message | As expected | Pass |
| TC-PRC-07 | Add with empty effective date | Leave the date blank, save | Error shown, nothing saved | As expected | Pass |
| TC-PRC-08 | Two prices on the same date | Add a price with an effective date that already exists for that product | Rejected (one price per product per date) | As expected | Pass |
| TC-PRC-09 | Edit a price | Click Edit on a price, change it, save | Change is saved and the Stamp shows EDITED | As expected | Pass |
| TC-PRC-10 | Delete a price | Click Delete on a price, confirm | Price becomes Inactive and the Stamp shows DELETED | As expected | Pass |

## E. Current Price

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-CUR-01 | Latest price is the current price | Product with two prices on past dates | Current Price shows the one with the latest date | As expected | Pass |
| TC-CUR-02 | Future price is not current | Add a price with an effective date in the future | Current Price does not change yet | As expected | Pass |
| TC-CUR-03 | Product with no price | Look at a product with no price rows | Current Price shows "—" | As expected | Pass |
| TC-CUR-04 | New price replaces the old | Add a price with today's date or a newer past date | Current Price shows the new price | As expected | Pass |
| TC-CUR-05 | Deleted price is ignored | Delete the newest price | Current Price falls back to the previous price | As expected | Pass |

**Summary:** 32 test cases, 32 Pass, 0 Fail, 0 Blocked.
