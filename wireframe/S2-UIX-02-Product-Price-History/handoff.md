# S2-UIX-02 — Product and Price History Handoff

**Figma:** https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/Untitled?node-id=18-11297

## Screens
- Product list with search and Add Product action
- Add Product and Edit Product forms
- Product price history
- Add Price and Edit Price forms
- Confirmation dialogs for product and price actions

## Expected behavior
- Selecting a product opens its price history.
- Adding or editing a product saves the product details.
- Adding or editing a price records the price and its effective date.
- Confirm before deleting a product or price.
- Show a clear message when a save succeeds or fails.

## Validation
- Mark required fields clearly.
- Prevent saving when required information is missing.
- Validate price as a valid, non-negative amount.
- Validate effective dates before saving.

## Roles and permissions
Follow the access assigned to each role in the system. Confirm the allowed product and price actions with the project team before implementation. Do not assume a role has permission if it is not confirmed.

## Developer notes
Use the Figma frame as the visual reference. Confirm field names, validation rules, and delete behavior with the team if they are not defined in the design or existing system.

## Verification
- [ ] Product list and search
- [ ] Add and edit product
- [ ] View price history
- [ ] Add and edit price
- [ ] Delete confirmation
- [ ] Success and error messages
- [ ] Role permissions
