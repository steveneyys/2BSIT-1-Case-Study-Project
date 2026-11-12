# Developer Handoff — S2-UIX-04

## 1. Empty States

### Customers and Products

When no records exist:
- Show a clear no-records message.
- Display zero counts.
- Do not display table data rows.
- Show Add Customer or Add Product only when permitted.

When a search returns no matches:
- Keep the entered search term visible.
- Show a no-results message.
- Provide Clear search to remove the search condition.
- Distinguish the number of matching results from overall record counts.

### Price History

- Show a message when no active price-history entries are available.
- Display "—" when no applicable current price exists.
- Do not display a previous sample price in an empty-history scenario.
- Show Add Price only when the account has that permission.

## 2. Form Validation

### Customer

- Identify missing required fields.
- Reject duplicate Customer Numbers.
- Keep entered values visible so users can correct them.
- Follow the agreed form and backend rules for required fields.

### Product

- Reject duplicate Product Codes.
- Validate required Description and Unit fields.
- Make the displayed error match the submitted value.

### Price

- Keep Product Code read-only for the selected product.
- Require a valid Effective Date.
- Reject an existing Product Code and Effective Date combination.
- Require a numeric Unit Price of zero or greater.
- Do not show a negative-price error for a valid value such as 0.00.

Validation must also run on the server.

## 3. Loading and Save Failures

### Loading Failure

- Explain that the records could not be loaded.
- Provide a Retry action.
- Retry repeats the failed loading request.
- Do not present unavailable counts as zero.

### Save Failure

- Explain that the changes could not be saved.
- Preserve entered form values.
- Allow the user to correct the input or retry Save.
- Show success only after the save is confirmed.

## 4. Delete Confirmations

Show the selected record before confirmation:

- Customer: Customer Number and Customer Name.
- Product: Product Code and Description.
- Price: Product Code, Effective Date, and Unit Price.

### Cancel

Close the confirmation without changing the record.

### Confirm

- Check the account's required Delete permission.
- Check applicable active related records.
- Perform a soft delete only when allowed.
- Mark the record Inactive.
- Update the Stamp with the action, account, and timestamp.
- Preserve record relationships.
- Refresh the affected list and counts after success.

Do not permanently remove the record or automatically delete
related records.

## 5. Blocked Deletion

- Block customer deletion when applicable active sales exist.
- Block product deletion when applicable active price-history
  or sale-detail records exist.
- Explain which relationship prevents deletion.
- Leave the record unchanged.
- Recheck dependencies when the request is submitted.
- If the request fails, do not show a successful deletion state.

## 6. Restore

- Restore is available to Admin and Superadmin accounts
  where supported.
- Change the restored record to Active.
- Update its Stamp.
- Refresh the list and counts.
- Preserve existing relationships.
- Do not assume restoring a parent automatically restores
  its inactive child records.

Unspecified parent/child restoration policies require a team decision.

## 7. Roles and Permissions

### Admin and Superadmin

- Can view active and inactive business records.
- Can see Status and Stamp columns.
- Can access applicable administrative filters and Restore actions.

### Regular User

- Sees active business records only.
- Does not see Status or Stamp columns.
- Does not see administrative status filters or Restore actions.
- Can use only the actions granted through assigned rights.

### Access Denied

- Explain the specific rejected action.
- Do not describe a permission failure as an empty list.
- A denied Delete action does not automatically remove View access.

The backend must enforce permissions on every request.
Hiding a button is not sufficient authorization.

## 8. Price Recalculation

- Current price comes from the latest active price-history entry
  effective on or before the current date.
- After a price entry becomes inactive, recalculate the current price
  from the remaining applicable active entries.
- Display "—" when none exists.
- Sales use the applicable price as of the sales date.

## 9. Design Scenario Notes

- Empty-list frames are separate examples from populated lists.
- The duplicate Product Code example uses P-001.
- The duplicate price example uses P-001 and 2026-06-01.
- The invalid Unit Price example uses -1.00.
- The product-delete confirmation uses a restored P-004 scenario
  with no active dependent records.
- The customer-delete confirmation examples assume the selected
  customer passes the active-sales check.
- These examples illustrate expected UI behavior, not backend test results.

## 10. Implementation Checklist

- [ ] Empty states match the returned records and counts.
- [ ] Clear search removes the search condition.
- [ ] Retry repeats the loading request.
- [ ] Failed saves retain form input.
- [ ] Validation messages match invalid values.
- [ ] Cancel leaves records unchanged.
- [ ] Confirm performs soft deletion only when allowed.
- [ ] Active dependencies block deletion.
- [ ] Restore updates status, Stamp, list, and counts.
- [ ] Unauthorized actions are rejected by the backend.
- [ ] Regular Users cannot retrieve inactive records or restricted fields.
- [ ] Current price is recalculated correctly.
