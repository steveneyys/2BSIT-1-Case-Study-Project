# S2-TST-03 Soft Delete and Restore Tests

**System:** Hope ERP  **Sprint:** 2  **Tester:** Llabres  **Date tested:** 2026-11-12

**Status values:** Pass, Fail, or Blocked.

**Soft delete means:** the row is marked Inactive, not removed. Admin and Superadmin can still see it (shaded) and can Restore it. A User cannot see it.

## A. Customer: Delete and Restore

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-DEL-01 | Delete asks for confirmation | Log in as Admin, click Delete on a customer with no sales | A confirm message is shown before anything happens | As expected | Pass |
| TC-DEL-02 | Cancel the delete | Click Delete, then Cancel | Customer stays Active, no change | As expected | Pass |
| TC-DEL-03 | Confirm the delete | Click Delete, then Confirm | Status becomes Inactive, row is shaded, Stamp shows DELETED, user and date | As expected | Pass |
| TC-DEL-04 | Row is not removed from the database | Check the customer table in the database after the delete | Row is still there with status Inactive | As expected | Pass |
| TC-DEL-05 | Deleted row buttons | Look at the deleted row (Admin) | Restore button is shown instead of Edit and Delete | As expected | Pass |
| TC-DEL-06 | Tabs and counts update | Delete a customer, look at the tabs | Customer moves to Inactive; Active and Inactive counts are updated | As expected | Pass |
| TC-DEL-07 | User cannot see a deleted customer | Log in as a User, look at the list and search the name | Customer is not shown or found | As expected | Pass |
| TC-DEL-08 | Restore a customer | Click Restore on the deleted row | Status returns to Active, Edit and Delete buttons return, Stamp changes | As expected | Pass |
| TC-DEL-09 | Restored customer is visible again | Log in as a User after the restore | Customer is shown again | As expected | Pass |
| TC-DEL-10 | Edit a deleted customer on the server | Send a direct edit request for a deleted customer | Refused, no change | As expected | Pass |

## B. Product and Price: Delete and Restore

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-DEL-11 | Delete a product | Log in as Admin, delete a product that has no sales, confirm | Product becomes Inactive, shaded, Stamp shows DELETED | As expected | Pass |
| TC-DEL-12 | User cannot see a deleted product | Log in as a User, look at the list and search | Product is not shown or found | As expected | Pass |
| TC-DEL-13 | Restore a product | Click Restore on the deleted product | Product is Active again | As expected | Pass |
| TC-DEL-14 | Price history is kept | Delete and restore a product that has prices | Its price history is the same after the restore | As expected | Pass |
| TC-DEL-15 | Delete a price | Delete a price in the price history, confirm | Price becomes Inactive and is not used as the current price | As expected | Pass |
| TC-DEL-16 | Restore a price | Click Restore on the deleted price | Price is Active again and Current Price is calculated again | As expected | Pass |

## C. Delete Blocked by Active Children

| ID | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-DEL-17 | Customer with active sales | Try to delete a customer that has active sales | Delete is refused with a clear message, customer stays Active | As expected | Pass |
| TC-DEL-18 | Product with active children | Try to delete a product that is used by active sales or has active prices (as the design says) | Delete is refused with a clear message, product stays Active | As expected | Pass |
| TC-DEL-19 | Blocked delete on the server | Send a direct delete request for the customer in TC-DEL-17 (F12 tools) | Server refuses it, nothing changes | As expected | Pass |
| TC-DEL-20 | Customer without children | Delete a customer with no sales | Delete works (see TC-DEL-03) | As expected | Pass |
| TC-DEL-21 | Data is still correct after a blocked delete | After TC-DEL-17, check the customer and its sales | Customer is still Active and its sales are unchanged | As expected | Pass |

**Summary:** 21 test cases, 21 Pass, 0 Fail, 0 Blocked.
