# S1-UIX-02 – Wireframes: Login, Register, Set/Reset Password

**Designer:** Gala | **Sprint:** 1 | **Status:** Merged
**Figma:** https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/HOPE-ERP-UI-UX?node-id=18-7801

## Contents
| File | Description |
|---|---|
| Auth-Wireframes.pdf | All 15 authentication screens, one per page |
| Authentication-Handoff-Notes.md | Rules and open decisions for developers |

## Screens (in PDF order)
| # | Screen | Purpose |
|---|---|---|
| 1 | Landing page | Public page with Sign In and Register |
| 2 | Sign In | Email and password login |
| 3 | Register | First name, last name, email only (no password) |
| 4 | Registration submitted | Account is Pending until a Superadmin approves |
| 5 | Set password | First login after approval, via one-time link |
| 6 | Reset password | Request a reset link |
| 7 | Email confirmation | Generic confirmation; does not reveal if the account exists |
| 8 | New password | Reset form |
| 9 | Validation | Required fields, email format |
| 10 | Password mismatch | Confirm password does not match |
| 11 | Expired link | Reset or set-password token expired |
| 12 | Used link | Token already used |
| 13 | Reset success | Password changed |
| 14 | Blocked | Blocked account cannot sign in |
| 15 | Disapproved | Registration was rejected |

## Design system
Uses S1-UIX-01 (colors, Host Grotesk and Instrument Sans, fields, buttons, dialogs).

## Related tasks
S1-DEV-02 (Register), S1-DEV-03 (Login/logout), S1-DEV-04 (Reset password),
S1-DBA-04 (reset token table), S1-TST-02 (auth test cases)
