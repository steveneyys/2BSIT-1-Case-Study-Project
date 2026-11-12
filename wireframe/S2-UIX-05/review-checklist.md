# Sprint 2 Usability Review Checklist

All items remain unchecked until reviewed on the implemented system.

## Navigation and Readability

- [ ] Customers, Products, and Price History are easy to locate.
- [ ] Page titles and action labels are clear.
- [ ] Table content is readable without overlapping or clipped text.
- [ ] Keyboard focus is visible.
- [ ] Search, tabs, forms, and actions follow a logical keyboard order.

## Customers

- [ ] Search and filters produce understandable results.
- [ ] No records and no search results have different messages.
- [ ] Required fields and validation errors are clear.
- [ ] Invalid submissions preserve entered values.
- [ ] Delete confirmation identifies the selected customer.
- [ ] Soft deletion is explained clearly.
- [ ] Blocked deletion explains the active relationship.
- [ ] Restore feedback and record counts update correctly.

## Products

- [ ] Product Code, Description, Unit, and Current Price are readable.
- [ ] Duplicate Product Code errors match the entered value.
- [ ] Required-field errors identify the affected fields.
- [ ] Delete confirmation identifies the selected product.
- [ ] Active related records prevent deletion where required.
- [ ] Restore is available only to permitted administrative roles.

## Price History

- [ ] The selected product is clearly identified.
- [ ] Effective Date and Unit Price are easy to understand.
- [ ] Duplicate effective dates show a clear error.
- [ ] Invalid dates and negative prices show appropriate errors.
- [ ] Current price excludes future-effective entries.
- [ ] No applicable current price is shown as “—”.
- [ ] Delete confirmation identifies the product, date, and price.
- [ ] View-only accounts cannot modify price entries.

## Feedback and Recovery

- [ ] Loading errors show Retry.
- [ ] Unavailable counts are not presented as zero.
- [ ] Save failures preserve form input.
- [ ] Cancel closes the dialog without changing the record.
- [ ] Success feedback appears only after a successful operation.
- [ ] Access-denied messages identify the restricted action.

## Roles

- [ ] Admin and Superadmin can view inactive records where supported.
- [ ] Administrative views show Status, Stamp, and Restore.
- [ ] Regular Users see active records only.
- [ ] Regular Users do not see Status, Stamp, or Restore controls.
- [ ] Available actions match the account’s assigned rights.

## Sample-Data Checks

Use these only when the original sample dataset is loaded:

- [ ] Alex’s sample account sees four active customer records
      and four active product records.
- [ ] Alex can Add/Edit Customers and Products but cannot Delete.
- [ ] Alex can view Price History without modifying prices.
- [ ] For a reference date of 2026-03-01, P-001 uses $12.50
      instead of the future-effective $13.75.
- [ ] Restoring the sample inactive record changes counts
      from Active 4 / Inactive 1 / All 5
      to Active 5 / Inactive 0 / All 5.

Backend enforcement requires separate implementation testing;
visible controls alone do not prove authorization is secure.
