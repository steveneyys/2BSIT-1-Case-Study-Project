# S1-UIX-01 – Design System (practical internal ERP)

**Designer:** Gala | **Sprint:** 1 | **Status:** Merged
**Figma:** https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/HOPE-ERP-UI-UX?node-id=[node-id]

## Contents
| File | Description |
|---|---|
| Design-System.png | Static deliverable: colors, typography, core components |

## Colors
| Name | Hex | Use |
|---|---|---|
| Canvas | #FCFCFD | Page background |
| Surface | #FFFFFF | Cards, tables, dialogs, fields |
| Primary | #074CE0 | Primary buttons, focus ring, active navigation |
| Border | #DDE0E6 | Dividers, field and card borders |
| Terracotta | #9C503B | Delete / destructive actions |
| Ochre | #806128 | Warning accents |
| Eigengrau | #181920 | Main text |

## Typography
| Font | Use |
|---|---|
| Host Grotesk | Headings and titles (e.g. "Customers") |
| Instrument Sans | Body text, labels, table data, amounts (e.g. "Acme Corporation / $234.50") |

Sizes: Heading [60px], Body [17px], Caption [10px]

## Components
**Buttons**
- Primary: "Save Customer" (Primary blue)
- Secondary: "Cancel" (outlined)
- Destructive: "Delete" (Terracotta)
- Disabled: "Add Price", shown when the account does not have the Add Price right

**Text fields and dropdown**
- States: Normal, Focus (blue border), Error (red border with message, e.g. "Customer No. already exists."), Read-only (grey, tagged [Read only])
- Dropdown: filled from a table, e.g. "C-001 — Acme Corporation"

**Checkboxes** (used in the Rights dialog)
- Checked, Unchecked, Disabled (e.g. View Customers, Delete Customer, Add Job)

**Navigation items**
- Active, Default, Denied (Denied items are hidden from the menu)

**Business record status** (data rows)
- Badges: Active, Inactive
- Status tabs with counts: Active 4 / Inactive 1 / All 5 (Admin only)
- Table columns: ID, Name, Status, Stamp, Actions
- Inactive (soft-deleted) rows are shaded and show Restore instead of Edit / Delete

**Account status** (user accounts)
- Badges: Active, Pending, Blocked, Disapproved
- Account status is separate from business Active / Inactive. Never use Restore for account approval.

**Section header and divider**
- Use section headers only where they group functional content (e.g. "Customer details").

**Dialog shell**
- Title, close (x), divider, message, Cancel + action button
- Example: "Delete customer?" – "The record becomes inactive. Existing relationships remain intact."

## Rules for developers
- Use only the colors and fonts listed above.
- Destructive actions always use Terracotta.
- A button the user has no right for is disabled with an explanation, or hidden if it is navigation.
- Soft delete: Delete sets the record to Inactive; only Admin and Superadmin see it.

