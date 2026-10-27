# S1-UIX-05 — Usability Review and Fix List

Assigned to: Dan Jewel Gala
Status: Review prepared — testing pending

## Figma
[View review checklist and fix list](https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/Untitled?node-id=18-9279)

## Review scope
- Registration and pending-account access
- Account approval and first-password setup
- Sign in and password reset
- User Management and role restrictions
- Rights dialog: permissions, Save, and Cancel
- Keyboard navigation, labels, and error messages

## Testing checklist
- [ ] Pending accounts cannot access the Dashboard.
- [ ] Approved accounts can set a password and sign in.
- [ ] Password reset handles invalid or expired links.
- [ ] Users only see authorized modules and actions.
- [ ] Rights changes save correctly; Cancel discards changes.
- [ ] Forms work with keyboard navigation and clear errors.

## Initial fix list
These are reference findings awaiting verification on the built website.

| Finding | Required action | Status |
|---|---|---|
| First-password setup is missing in the reference HTML. | Implement and test password setup with valid tokens. | Pending verification |
| Dashboard Quick Actions bypass navigation permission checks. | Apply the same access policy to navigation and Quick Actions. | Pending verification |
| Reference login accepts any password and creates unknown accounts. | Replace prototype shortcuts with proper authentication. | Pending verification |
| Account approval permissions differ between references. | Confirm the approved role policy before implementation. | Needs clarification |

## Actual review results
Not yet performed. Add the review date, reviewer, website
version, actual results, screenshots, and retest outcomes
after testing the built screens.
