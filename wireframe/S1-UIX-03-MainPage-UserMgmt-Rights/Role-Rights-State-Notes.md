# Role, Rights and State Notes (S1-UIX-03)

> Companion notes. Not part of the product UI.

## Roles and sample accounts
| Account | Role |
|---|---|
| Michael Reyes / ceo@hope.com | Superadmin |
| Sarah Chen / superadmin@hope.com | Superadmin |
| Lisa Park / admin@hope.com | Admin |
| David Kim / manager@hope.com | Admin |
| Alex Rivera / user@hope.com | User |

## Rules
- Superadmin manages roles, approval and designation.
- Admin cannot see Superadmins. Admin rows show "—" in Actions. Admin manages Users only and never assigns Admin or Superadmin.
- A User cannot access User Management.
- Last-Superadmin guard is required by the plan. The protection screen shows the one-active-Superadmin case.
- Registration approval and disapproval are Superadmin-only (Sprint Plan). The HTML prototype lets Admin approve; do not copy this. A policy change needs owner confirmation.
- Account status (Active, Pending, Blocked, Disapproved) is not business-record status (Active, Inactive).
- Approval grants no module rights automatically.

## Rights catalogue
36 rights = 3 Customer + 6 Product + 13 Human Resources + 7 Sales + 7 Reports.
5 module View controls govern module access and are not counted in the 36 (41 checkboxes in total).
Map the 5 View controls to module access; do not add them as 5 extra rights.

## Rights dialog behavior
- Opens from a User row. The list behind is dimmed and not clickable.
- Only the permission list scrolls. The header and the Cancel / Save footer stay visible.
- Focus moves into the dialog, keyboard works, and focus returns to the originating button on close.
- All selects the module View and all its rights. None clears both.
- View off clears and disables the children. View on does not select the children.
- Cancel, close or Escape discards the draft. Save persists only after server authorization.
- No role selector in the dialog; the role is set in the account form.
- Admin's Rights modal targets a User (Alex); Admin cannot manage Admins or Superadmins.

## Sample: Alex Rivera (User)
Customers and Products: View, Add, Edit. Sales: View and View Sale Details. Reports: View, Product Master List, Top Sales. No Delete, no price changes, no HR. Prices read-only history is allowed by Products View. Navigation and Quick Actions use the same checks.

## Other
- Dashboard figures are demonstration data, not live results.
- System Settings appears only in the Guide; its scope is unresolved, so no controls were invented.
- The backend must check authorization on every request and filter rows and sensitive fields. Hidden UI in static Figma is not security.
