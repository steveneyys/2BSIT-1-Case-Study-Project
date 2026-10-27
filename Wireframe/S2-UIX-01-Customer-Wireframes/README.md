# S2-UIX-01 — Wireframes: Customer Screens

Assigned to: Dan Jewel Gala
Status: Prepared — for team review

## Figma
[View customer wireframes](https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/Untitled?node-id=18-11188)

## Included screens
- Customer list for Superadmin, Admin, and User
- Add Customer form and modal
- Edit Customer form and modal
- Customer role and behavior notes

## Fields
- Customer No.
- Customer Name
- Address
- Payment Terms

All fields are required.
Customer No. is unique and read-only when editing.

## Access rules
- Superadmin/Admin can view active and inactive records,
  Status, Stamp, status filters, and Restore.
- Users see active records only.
- User actions depend on assigned permissions.
- Alex Rivera's example permits View, Add, and Edit only.

## Review item
Align the search hint with the documented search scope:
customer number, name, address, and payment terms.

## Related states
Empty, error, and confirm-delete designs are in S2-UIX-04.

## Validation
Static wireframes only; runtime behavior has not been tested.
