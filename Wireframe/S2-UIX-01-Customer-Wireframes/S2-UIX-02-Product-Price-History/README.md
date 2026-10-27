# S2-UIX-02 — Wireframes: Product and Price History Screens

Assigned to: Dan Jewel Gala
Status: Prepared — for team review

## Figma
[View product and price-history wireframes](https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/Untitled?node-id=18-11302)

## Included screens
- Product lists with role-based views
- Add Product and Edit Product
- Price History for Admin and User
- Add Price and Edit Price
- Modal versions of the forms and price history
- Effective-date price comparison
- Product and pricing notes

## Product fields
- Product Code
- Description
- Unit

All product fields are required.
Product Code is unique and read-only when editing.

## Price rules
- Price must be nonnegative.
- Product Code is read-only in price forms.
- Effective Date is read-only when editing a price.
- Duplicate product and effective-date combinations are rejected.
- Price history is displayed newest first.
- Current price uses the latest active price effective
  on or before the selected date.
- Display an em dash when no applicable price exists.

## Access rules
- Superadmin/Admin can view inactive records,
  Status, Stamp, filters, and Restore.
- Users see active records only.
- Alex Rivera's price history is read-only.

## Related states
Empty, error, and confirm-delete designs are in S2-UIX-04.

## Validation
Static wireframes only; runtime behavior has not been tested.
