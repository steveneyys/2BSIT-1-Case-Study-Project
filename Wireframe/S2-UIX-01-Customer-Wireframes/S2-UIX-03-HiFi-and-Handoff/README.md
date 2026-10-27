# S2-UIX-03 — Hi-Fi Mockups and Handoff Notes

Assigned to: Dan Jewel Gala
Status: Prepared — for team review

## Figma
[View hi-fi mockups and handoff](https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/Untitled?node-id=18-11487)

## Included mockups
- Customer lists and Add/Edit Customer
- Product lists and Add/Edit Product
- Price History and Add/Edit Price
- Role-based screen variants
- Modal layouts
- Effective-date price comparison

## Visual specifications
- Headings: Host Grotesk
- Body and controls: Instrument Sans
- Primary blue: #074CE0
- Page background: #FCFCFD
- Primary text: #16191F
- Border color: #DDE0E6
- Panel corner radius: 12 px

## Developer handoff
- Apply role permissions to both navigation and actions.
- Validate required fields and duplicate identifiers.
- Keep existing customer and product identifiers read-only.
- Preserve entered values when saving fails.
- Cancel closes forms without saving.
- Dialogs receive keyboard focus and return focus on close.
- Provide visible focus and readable error messages.
- Enforce authorization on the server.

## Deletion behavior
Use soft deletion and preserve relationships.
Block deletion when active dependent records exist.

## Validation
These are static mockups and implementation specifications.
They do not confirm completed development or usability testing.
