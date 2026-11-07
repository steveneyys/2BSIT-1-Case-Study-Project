# S2-UIX-03 — Developer Handoff

**Figma:** https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/Untitled?node-id=18-11482  
**Status:** Ready for review

## Included screens
- Customer list and customer forms
- Product list and product forms
- Product price history
- Add and edit price forms
- Confirmation dialogs

## Interactions
- Selecting a customer or product opens its details.
- Add and edit forms allow users to enter or update the displayed information.
- Saving should show a success message; errors should explain what needs attention.
- Confirm before deleting a record.
- Selecting a product’s price history shows its recorded prices and effective dates.

## Validation
- Mark required fields clearly.
- Check email format where an email field is shown.
- Accept only valid, non-negative prices.
- Check required dates before saving.
- Keep the form open and show the error if validation fails.

## Roles and permissions
Use the system’s assigned access for Superadmin, CEO, Admin, and User. Confirm which roles may add, edit, or delete customers, products, and prices before implementation. Keep unconfirmed permissions marked **Pending**.

## Responsive behavior
Keep forms and tables usable on smaller screens. Allow wide tables to scroll horizontally or use a suitable compact layout. Preserve readable text and accessible controls.

## Developer notes
Use the Figma screens as the visual reference. Confirm unclear field rules, delete behavior, and permission details with the project team before implementation.

## Verification
- [ ] Customer screens match the approved mockups
- [ ] Product screens match the approved mockups
- [ ] Price history and price forms work as specified
- [ ] Validation and confirmation states are implemented
- [ ] Role permissions are confirmed
- [ ] Responsive layout is checked
