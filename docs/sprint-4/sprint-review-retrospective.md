# Sprint 4 – Review and Retrospective

**Task:** S4-SM-05 (part 1) · **Sprint:** 4 (Weeks 7–8) · **Facilitator:** Scrum Master

> **DRAFT written Sat 2026-11-28.** The report is due on D10 (Mon 2026-12-14). Everything below is what the repository shows today. Fields marked `____` and items marked **(update on D10)** must be filled at the review and retrospective meetings; do not hand this in with them empty. Nothing in the demo, feedback or mood sections has been invented.

## Part A – Sprint Review

### 1. Sprint goal and result

**Goal:** People who hold the right can record sales with line items priced as of the sale date, record payments and see balances, and print the seven reports; delete and restore follow the rules; only a Superadmin can open the audit viewer.

**Result so far: built, not yet verified.** The Developer and Designer tasks are merged (13 of 30). The goal can only be called **Met** after: the Sprint 4 SQL has run against a real database with demo data (IMP-26, IMP-27), the Tester has run the cases and the end-to-end test on the merged build (S4-TST), and the decisions D1 to D11 are confirmed (IMP-28). **(update on D10)**

### 2. What was delivered (on `main` at 2026-11-28)

| Area | Delivered |
|---|---|
| Sales | List with search, filters and paging; Add and Edit a sale (customer, employee, date; generated `TR` number; employment-date check); a date change that reprices lines asks for confirmation and is refused if a line would have no price |
| Sale details | Add, edit, delete and restore lines (product, whole-number quantity); unit price is the price in force on the sale date; line amounts and total in pesos; Admin sees and restores deleted lines |
| Payments | Record a payment against a sale (receipt number, date not in the future, amount with two decimals); overpayment refused; sales with unpriced lines refused; one writer per sale at a time |
| Balances | Balance per transaction and per customer: Balance due, Paid in full or Overpaid; links from Sales, the sale page and payments |
| Delete and restore a sale | Confirmation; blocked while active lines or payments exist, with the counts; nothing deleted automatically; Admin-only restore |
| Reports | Seven reports with Print and Save as PDF: product master, active employees, all employees, employee job history (also needs View Job History), top customers, top products, top sales (date range, Top N up to 100, total, unpriced note) |
| Audit viewer | Superadmin only: filters (dates, actor, module, action, record reference), newest first, paging, changed fields with previous and new value, credentials hidden; Admin and User turned away to the dashboard with a message |
| Rights | Sales, details, payments, balances, reports and audit follow the rights on the server; the rights matrix test covers the change routes |
| Design | Wireframes and hi-fi for sales, payments, balances, reports and the audit viewer; a final consistency checklist (review not run) |
| Database | **Nothing new on `main`** (S4-DBA-01 to 06 open); the build uses the Sprint 2 price-as-of function and active views |
| Testing | Developer unit tests only (408 in the suite when DEV-08 was packaged). **No Sprint 4 test file from the Tester yet.** |

### 3. Demo checklist (run live) **(update on D10: tick and add results)**

The full script with expected results, roles and fallbacks is in `release-checklist-and-demo-script.md`, Part 2. Tick here when each block has been shown on the release candidate:

- [ ] Sign-in, registration and approval (Sprint 1)
- [ ] Customers, products and price history (Sprint 2)
- [ ] Human Resources and the salary rule (Sprint 3)
- [ ] Sales, lines priced on the sale date, totals
- [ ] Payments, overpayment refused, balances
- [ ] Delete blocked, delete and restore of a sale
- [ ] Seven reports and Print
- [ ] Audit viewer as Superadmin; restricted for Admin
- [ ] Backup and restore

### 4. Not done or carried over (as of 2026-11-28)

| Item | Why | Carry to |
|---|---|---|
| S4-DBA-01 to 06 (views, checks, demo data, indexes) | Not merged | Finish this sprint (D2 to D9) |
| S4-TST-01 to 06 (cases, rights, end-to-end, bug log, sign-off) | Not started on `main` | Finish this sprint |
| Run on a real database (IMP-26) | SQL verified with stubs only | D3 to D5 |
| Usability review of built screens (IMP-16) | Plan only in three sprints | D6 |
| Decisions C1 to C9, D1 to D11 (IMP-28) | No meeting record | D3 |
| Delete and restore of payments (D10, IMP-30) | Not in any task | Future work unless added |
| Email delivery, Disapproved status, deleted prices view | Dropped or Could | Future work (listed in the project report) |

### 5. Stakeholder feedback and demo questions

____________________________________________________________

### 6. Impediment log result

Sprint 4 so far: 6 logged (IMP-25 to IMP-30), 6 open. Carried from earlier sprints: 6 open, 3 mitigated. **(update on D10)** See `impediment-log.md`.

## Part B – Retrospective (draft for the meeting)

### 7. What went well

- The designs were on `main` before the build and the Developer followed them (UIX-01 to 05 on 2026-11-23 and 11-24, DEV on 11-27).
- Server-side rules held across four sprints: every route checks the right, Restore is Admin only, soft delete keeps relationships, salary is hidden without View Job History (including in a report).
- Each Developer task shipped with automated tests; the suite grew from 93 (Sprint 1) to 165 (Sprint 2), 260 (Sprint 3) and 408 (Sprint 4, local count; confirm with `npm test` on `main`).
- Delete is never silent: a blocked delete says why and how many records are in the way, and nothing is removed automatically.
- Sprint 3 closed with all 30 PRs merged, the same velocity as Sprints 1 and 2.

### 8. What did not go well (and why)

| Problem | Root cause |
|---|---|
| The build again arrived in one go: eight tasks in 26 minutes (R1, IMP-25) | The D3 and D5 checkpoints were written but nobody was asked to report; the Scrum Master did not run them |
| No migration before the screens (R2, IMP-27) | The DB Admin's tasks were not started or not visible; the "migration before Developer task" rule still has no check |
| The Sprint 4 SQL was never run on a real database (IMP-26) | The work was checked with stubs and no one scheduled the run against the Supabase database |
| Decisions made by default (IMP-28) | The decision meeting from Sprint 3 D7 was not held or not recorded |
| Design and build disagree on currency and numbers (IMP-29) | The designer used sample dollars; the handoff did not say which format wins |
| Traceability (IMP-25) | PR titles carry the task ID but no description; two tasks and a revert in one PR |
| Scrum Master documents were late in Sprints 2 and 3, and the Sprint 4 set is again written ahead of the work and from the repository, not from live checks | The checkpoints were written after the fact; no weekly follow-up |
| Usability review never run (IMP-16) | It depends on built screens and was not rescheduled when they merged |

### 9. Actions (for the last days, and for any future team)

| # | Action | Owner | Due |
|---|---|---|---|
| F1 | Merge migrations and run all Sprint 4 screens on a real database; record commit and date | DB Admin, Developer | D5 |
| F2 | Test files with "Build tested: commit, date"; final sign-off names the commit | Tester | D9 |
| F3 | Decision meeting; answers written into the planning notes | Scrum Master, all | D3 |
| F4 | Usability review on `main`; fix list | UI/UX Designer | D6 |
| F5 | Key rotation confirmed in writing | Developer | D3 |
| F6 | PR description template filled in for every PR (what, migrations, tests, decisions) | Everyone | ongoing |
| F7 | Checkpoint results posted on the board on D2, D3, D5 and D8 | Scrum Master | those days |
| F8 | Peer evaluations handed to the Scrum Master by D8 | Everyone | D8 |

### 10. One thing each person will do differently **(fill in at the meeting)**

| Role | Commitment |
|---|---|
| Developer | ____ |
| DB Admin | ____ |
| Tester | ____ |
| UI/UX Designer | ____ |
| Scrum Master | ____ |

### 11. Team mood (1 to 5) **(fill in at the meeting)**

Average: ____ · Comments: ____________________________________
