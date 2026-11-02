# S1-UIX-05 – Usability Review of Built Screens and Fix List

**Designer:** Gala | **Sprint:** 1 | **Status:** IN PROGRESS (review not yet run)
**Figma:** https://www.figma.com/design/HiCl2hqGS1rNeTSvNMc3Fm/HOPE-ERP-UI-UX?node-id=18-9274
**Build reviewed:** [commit hash or build URL]
**Reviewed on:** [date] **Device / browser / viewport:** [e.g. Chrome, desktop 1384 px; mobile 390 px]

## Scope
Built Sprint 1 screens compared with S1-UIX-02, S1-UIX-03 and S1-UIX-04.
This is a design and usability review. It is separate from the functional test cases of S1-TST-02 to S1-TST-04.

## Builds under review
| Task | Screen / feature | PR |
|---|---|---|
| S1-DEV-02 | Register | [#19](https://github.com/steveneyys/2BSIT-1-Case-Study-Project/pull/19) |
| S1-DEV-03 | Login, logout, set password | [#21](https://github.com/steveneyys/2BSIT-1-Case-Study-Project/pull/21) |
| S1-DEV-04 | Reset password | [#23](https://github.com/steveneyys/2BSIT-1-Case-Study-Project/pull/23) |
| S1-DEV-05 | User Management | [#27](https://github.com/steveneyys/2BSIT-1-Case-Study-Project/pull/27) |
| S1-DEV-06 | Approve users, designate admins, last-Superadmin guard | [#28](https://github.com/steveneyys/2BSIT-1-Case-Study-Project/pull/28) |
| S1-DEV-07 | Rights dialog | [#29](https://github.com/steveneyys/2BSIT-1-Case-Study-Project/pull/29) |
| S1-DEV-08 | Main page and permission check | [#30](https://github.com/steveneyys/2BSIT-1-Case-Study-Project/pull/30) |
| S1-DBA-05 | Seed: modules, 36 rights, roles | [#31](https://github.com/steveneyys/2BSIT-1-Case-Study-Project/pull/31) |

## 1. Usability checklist
Result: Pass / Fail / Not run

| # | Scenario | Design reference | Result | Finding # |
|---|---|---|---|---|
| 1 | Register without a password; a Pending account cannot enter the Dashboard | UIX-02/04: Register, Registration submitted, Pending | Not run | |
| 2 | Approve as Superadmin, set first password, then sign in | UIX-04: Set password | Not run | |
| 3 | Reset request, generic confirmation, expired token, used token, mismatch, success | UIX-02/04: Reset flow | Not run | |
| 4 | Keyboard tab order, labels, visible focus, Show password, error announcement | UIX-04 handoff §10 | Not run | |
| 5 | 36 right labels, 5 module View controls, disabled children, Save vs Cancel | UIX-04: Assign Rights | Not run | |
| 6 | Admin sees no Superadmin rows; Admin actions show "—"; User Management hidden for User | UIX-03/04: User Management | Not run | |
| 7 | Unauthorized Quick Actions are blocked; last active Superadmin is protected | UIX-04: Last-Superadmin protection | Not run | |
| 8 | Layout matches design: fonts, colors, spacing, 44 px targets | S1-UIX-01 and UIX-04 specs | Not run | |
| 9 | Narrow viewport: forms fit, tables scroll, dialogs fit | UIX-04 handoff §9 | Not run | |

## 2. Findings (fix list)
Severity: High = blocks a task or breaks security; Medium = confusing or off-design; Low = cosmetic.

| # | Screen | What I saw | Expected (reference) | Severity | Owner | Evidence | Fix PR | Retest |
|---|---|---|---|---|---|---|---|---|
| F1 | | | | | | | | |

## 3. Known reference gaps (from the design review)
| # | Gap | Required | Owner | Status |
|---|---|---|---|---|
| G1 | HTML reference had no first-login workflow | Set password with real token backend | Developer | Check in build |
| G2 | Old rights matrix was incomplete | 36 rights + 5 module View controls | Developer / DBA | Design fixed; check in build |
| G3 | HTML Quick Actions bypassed sidebar checks | One shared access policy | Developer | Check in build |
| G4 | Approval: plan says Superadmin-only (task plan S1-DEV-06) | Admin must not approve | Scrum Master | Check in build |
| G5 | HTML accepted any password, created unknown accounts, and Google bypassed approval | None of these in production | Developer | Check in build |
| G6 | Old copy had school/student wording and wrong identities | Hope business wording and the five demo users | Designer | Check in build |
| G7 | Hidden UI is not security | Server checks every request | Developer | Check in build |

## Notes
- Only items marked Pass or Fail were actually tested. "Not run" means not tested.
- Task plan status is metadata, not test evidence.
- Rights count is aligned with S1-UIX-04 and S1-DBA-05.
