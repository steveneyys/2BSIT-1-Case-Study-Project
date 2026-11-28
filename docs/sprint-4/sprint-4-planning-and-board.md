# Sprint 4 Planning Notes and Board (S4-SM-01)

**Sprint:** 4 · **Weeks:** 7–8 · **Working days:** D1 Tue 2026-12-01 to D10 Mon 2026-12-14 (Monday to Friday) · **Facilitator:** Scrum Master
**Modules:** Sales (sales, sale details, payments, balances) and Reports (seven reports and the audit viewer), from the module map in `Sprint-board.md`

> **Written ahead of D1, from the repository on Sat 2026-11-28.** Sprint 3 had all 30 PRs merged on 2026-11-25 (S3-DBA-06 in #117), so Sprint 4 work has already started: the five designs (S4-UIX-01 to 05) merged on 2026-11-23 and 2026-11-24 and the eight Developer tasks (S4-DEV-01 to 08, PRs #120 to #127) merged on 2026-11-27 between 22:00 and 22:26. The board below shows that real state. **Dates and planned days are assumptions**: D1 to D10 follow ten Monday-to-Friday days after Sprint 3's assumed close (Mon 2026-11-30), and each task's planned day copies the Sprint 3 pattern because the Sprint 4 task plan is not in the repository. Replace the "Planned day" column with the task plan's days if they differ; nothing else depends on it except the burndown.

## 1. Sprint goal

People who hold the right can record sales with line items priced as of the sale date, record payments against a sale and see what is still owed, and print the seven reports; every action follows the person's rights on the server; a deleted sale is kept and an Admin can restore it; and only a Superadmin can open the audit viewer. After this sprint the system is ready for the final demo.

## 2. Capacity and commitment

| Role | Planned PRs | Notes |
|---|---|---|
| Developer | 8 | S4-DEV-01 to S4-DEV-08 |
| DB Admin | 6 | S4-DBA-01 to S4-DBA-06 |
| Tester | 6 | S4-TST-01 to S4-TST-06 (includes the end-to-end test and the final sign-off) |
| UI/UX Designer | 5 | S4-UIX-01 to S4-UIX-05 |
| Scrum Master | 5 | S4-SM-01 to S4-SM-05 |
| **Team total** | **30** | Same as Sprints 1 to 3 (velocity 30). |

One task is one PR. Branches: one per role (Developer, DB-Admin, Tester, UI/UX-design, Scrum-Master). Nobody pushes to `main`. PR title: `TASK-ID: short description`.

## 3. Carry-over into Sprint 4 (decide at planning)

Full list with evidence: `docs/sprint-3/sprint-2-carryover-reprioritization.md`. Status here is only what the repository shows on 2026-11-28; the decision meeting that was planned for Sprint 3 D7 has no record in the repository, so every "decision" below is still **to confirm**.

| # | Item | Status 2026-11-28 | Proposed handling in Sprint 4 | Decision owner |
|---|---|---|---|---|
| C1 | Module View controls (5) | Not decided. Sales and Reports work by rights only, as HR does. | Confirm "any right in a module opens it" and write it in the rules guide. | DB Admin, Developer |
| C2 | Disapproved status and action | Not built. | Drop, one line in the final review. | Team |
| C3 | Real email delivery | Not built. | Console links for the demo; listed in the release checklist. | Team |
| C4 | Key rotation | No written confirmation. | Developer replies "rotated" with the date. **Must** before the release. | Developer |
| C5 | Built-screen usability review | Plans only (S2-UIX-05, S3-UIX-05, S4-UIX-05 all say no review done). | One session on the merged `main`, all modules. | UI/UX |
| C6 | Test evidence tied to a build | Sprint 3 files still have no commit and date. | Every Sprint 4 test file has "Build tested: commit, date"; the final sign-off lists the commit. | Tester |
| C7 | TC-PR-01 to 03 and TC-HR-02 expectation | Open (depends on C1). | Fix the expectation once C1 is decided. | Tester, Developer |
| C8 | Restore rules | Build: restore is Admin only; delete blocked by active children. | Record as decided. | Team |
| C9 | Deleted prices cannot be viewed | Not built. | Could; only if time is spare. | Developer |

### New decisions raised by the Sprint 4 build (the Developer made an interim choice; the team confirms)

| # | Question | Interim choice in the build | Owner |
|---|---|---|---|
| D1 | Which right controls payments? The catalogue has `SALE_*` and `SALEDET_*` and no payment right (risk R5). | Payments and balances open with any Sales-list right; recording a payment needs `SALE_EDIT`. | Team, DB Admin |
| D2 | Overpayment | Refused (the balance cannot go below zero). | Team |
| D3 | Quantity | Whole number from 1. | Team |
| D4 | Official receipt number | `OR` plus six digits suggested; 1 to 8 letters or digits; unique, including deleted rows. | Team |
| D5 | Transaction number format | `TR000125` style, as in the base schema, not the `T-001` in the wireframes. | Team, UI/UX |
| D6 | Currency | Philippine peso (₱). The wireframe examples use `$`. | Team, UI/UX |
| D7 | Which seven reports, and the split | Product master, active employees, all employees, employee job history, top customers, top products, top sales (4 + 3). The report list is the Developer's reading of the plan. | Team |
| D8 | "Active employee" | Not separated as of today. | Team |
| D9 | Top N | Capped at 100; the period filters on the sale date. | Team |
| D10 | A sale with active payments | Cannot be deleted from the screens, because payment soft delete and restore is not in any Sprint 4 task. | Team |
| D11 | Audit viewer detail | Result and request reference are not in `audit_log` so they are not shown; only credentials are hidden (salary stays visible to the Superadmin). | Team |

## 4. Dependencies and order of work

| Needed first | Needed by | Why | State on 2026-11-28 |
|---|---|---|---|
| S4-UIX-01 to S4-UIX-04 | S4-DEV-01 to S4-DEV-08 | Build to the approved design. | Merged. |
| S4-DBA-01 to S4-DBA-03 (sales totals, balance view, report queries) | S4-DEV-01 to S4-DEV-06 | Totals and balances should come from one place. | **Not merged.** The Developer computed totals, balances and report figures in the application's SQL from `price_as_of`, `salesdetail_active` and `payment_active` (migration 008 and earlier). Rule R2 was missed a third time. |
| S4-DBA-04 and S4-DBA-05 (checks, demo data) | S4-TST-01 to S4-TST-05, demo | The demo needs sales, lines and payments to show. | **Not merged.** There is no Sales demo data on `main`. |
| S4-DEV-01 to S4-DEV-08 | S4-TST-01 to S4-TST-06, S4-UIX-05 | Tests and the usability review need built screens. | Merged. |
| All build tasks | S4-SM-03 to S4-SM-05 | Release checklist, demo and the final review describe what exists. | Drafts in this batch. |

## 5. Stories, acceptance criteria and board (state at Sat 2026-11-28)

The criteria below are written from the built screens and the wireframes in `wireframe/S4-UIX-0*`, because the task plan text is not in the repository. Planned days are assumed (see the note at the top). **13 of 30 tasks are merged; 17 are open** (six DB Admin, six Tester, five Scrum Master).

| ID | Acceptance criteria | Planned day | Board |
|---|---|---|---|
| S4-DEV-01 | Sales list with search, filters and paging; Add and Edit a sale header (customer, employee, date); the number is generated; a date change that reprices lines asks for confirmation. | D2 12-02 | Merged 11-27 · #120 |
| S4-DEV-02 | Sale details: add, edit, delete and restore lines; price comes from the price in force on the sale date; no price means the line cannot be saved; total shown. | D3 12-03 | Merged 11-27 · #121 |
| S4-DEV-03 | Record payments against a sale; the balance falls; overpayment refused; payment list with search. | D4 12-04 | Merged 11-27 · #122 |
| S4-DEV-04 | Reports part 1: product master, active employees, all employees, employee job history; Print and Save as PDF; job history only with View Job History. | D5 12-07 | Merged 11-27 · #123 |
| S4-DEV-05 | Reports part 2: top customers, top products, top sales for a date range and a Top N. | D6 12-08 | Merged 11-27 · #124 |
| S4-DEV-06 | Balance per transaction and per customer with Paid in full, Balance due or Overpaid. | D7 12-09 | Merged 11-27 · #125 (with DEV-07 first try and its revert) |
| S4-DEV-07 | Delete a sale with confirmation, blocked while active lines or payments exist; Admin restores. | D8 12-10 | Merged 11-27 · #126 (first try in #125 was reverted) |
| S4-DEV-08 | Audit viewer for the Superadmin only: filters, event list, changed fields, redaction; others are turned away. | D9 12-11 | Merged 11-27 · #127 |
| S4-DBA-01 | Sales totals view. | D2 12-02 | To do |
| S4-DBA-02 | Balance view. | D4 12-04 | To do |
| S4-DBA-03 | Report queries or views. | D5 12-07 | To do |
| S4-DBA-04 | Delete and restore checks for sales, details and payments (parent and child). | D6 12-08 | To do |
| S4-DBA-05 | Demo data: sales, lines at different price dates, payments, a deleted sale. | D7 12-09 | To do |
| S4-DBA-06 | Indexes reviewed; backup and restore checked on the new tables. | D9 12-11 | To do |
| S4-TST-01 | Sales and sale details cases with expected results; results recorded. | D3 12-03 | To do |
| S4-TST-02 | Payments and balances cases. | D5 12-07 | To do |
| S4-TST-03 | Reports cases, including salary hidden without the right and Print. | D7 12-09 | To do |
| S4-TST-04 | Sales, report and audit rights checked as menu, button and server. | D8 12-10 | To do |
| S4-TST-05 | End-to-end test and regression of Sprints 1 to 3 on the merged build. | D9 12-11 | To do |
| S4-TST-06 | Bug log and final sign-off naming the commit; no open Critical or High. | D9 12-11 | To do |
| S4-UIX-01 | Sales entry and line item wireframes. | D2 12-02 | Merged 11-23 |
| S4-UIX-02 | Payment and balance wireframes. | D3 12-03 | Merged 11-24 |
| S4-UIX-03 | Report screens and audit viewer. | D4 12-04 | Merged 11-24 |
| S4-UIX-04 | Hi-fi mockups and handoff notes. | D5 12-07 | Merged 11-24 |
| S4-UIX-05 | Final consistency and usability pass. | D9 12-11 | Merged 11-24 (review plan only; no review run) |
| S4-SM-01 | This document. | D1 12-01 | In this batch |
| S4-SM-02 | Mid-sprint check and impediment log. | D5 12-07 | In this batch (early version) |
| S4-SM-03 | Release checklist and demo script. | D8 12-10 | In this batch (draft) |
| S4-SM-04 | Final peer evaluations collected. | D9 12-11 | In this batch (form and tracker; nothing collected yet) |
| S4-SM-05 | Final review, retrospective and project report. | D10 12-14 | In this batch (draft) |

## 6. Risks at planning

The full register is `docs/sprint-3/sprint-4-risk-register.md`. Status of the ones that already happened:

| Risk | Plan | What has happened |
|---|---|---|
| R1 The build arrives in one day | One task per PR as each is done; D3 and D5 checkpoints. | **Happened again, more sharply:** all eight Developer tasks merged in 26 minutes on 2026-11-27 (22:00 to 22:26), before D1. |
| R2 Migrations after the screens | S4-DBA-01 to 03 by D2 to D3. | **Happened:** no Sprint 4 migration on `main`. |
| R3 Tests before the build | "Build tested" line in each file. | Not yet testable: no S4-TST file exists. The build is on `main`, so the Tester can start now. |
| R5 No right for payments | Decide at planning. | Interim choice in the build (D1 above), not yet confirmed. |
| R8 Database messages | Mapping and one run against a real database. | Not done: the Sprint 4 SQL has been run only against stubs (see IMP-26). |

## 7. Definition of Done

Unchanged from `team-rules-and-role-guide.md` (criteria 1–9), including "permission checks are enforced on the server" and "no secrets in the repo".

## 8. Meeting record

| Item | Value |
|---|---|
| Planning meeting date | ____ |
| Attendees | ____ |
| Decisions on C1–C9 and D1–D11 | ____ |
