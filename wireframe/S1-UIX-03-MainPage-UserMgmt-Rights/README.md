# S1-UIX-03 – Wireframes: Main Page, User Management List, Rights Dialog

**Designer:** Gala | **Sprint:** 1 | **Status:** Merged
**Figma:** https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/HOPE-ERP-UI-UX?node-id=18-8012

## Contents
| File | Description |
|---|---|
| MainPage-UserMgmt-Rights-Wireframes.pdf | 16 wireframe pages (see list below) |
| Role-Rights-State-Notes.md | Roles, rights, account states and dialog behavior |

## Screens (in PDF order)
| # | Screen | Role |
|---|---|---|
| 1 | Landing page (reference only) | Public |
| 2-4 | Dashboard (main page) | Superadmin, Admin, User |
| 5-6 | User Management list | Superadmin, Admin |
| 7-8 | Add User, Edit User | Superadmin |
| 9-10 | Add User, Edit User | Admin |
| 11 | Approval / account states | Superadmin |
| 12 | Last-Superadmin protection | Superadmin |
| 13 | Assign Rights: full catalogue (36 rights + 5 module View controls) | Superadmin |
| 14 | Assign Rights: scroll continuation, pinned header and footer | Superadmin |
| 15-16 | Rights modal opened from a user row | Superadmin, Admin |

## Key rules shown
- The authenticated Dashboard is the main page for each role. The sidebar and tiles follow role and rights.
- Admin cannot see Superadmins and manages Users only.
- A normal User cannot open User Management or Rights.
- Approval and disapproval of registrations are Superadmin-only.

## Design system
Uses S1-UIX-01. S1-UIX-04 contains the hi-fi version.

## Related tasks
S1-DEV-05, S1-DEV-06, S1-DEV-07, S1-DEV-08, S1-TST-03, S1-TST-04
