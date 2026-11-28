# Sprint 4 – Impediment Log

**Task:** S4-SM-02 · Continues the Sprint 1 to 3 logs (IMP-01 to IMP-24). An impediment is anything that slows or stops someone; the Scrum Master's job is to get it removed. Dates are `YYYY-MM-DD`. Owner is a role. Status for carried items is what the repository shows on 2026-11-28; "Open" means no evidence of a fix on `main`.

## Carried over (status updated 2026-11-28)

| ID | Raised | Impediment | Owner | Status | Evidence / next step |
|---|---|---|---|---|---|
| IMP-09 | 2026-11-02 | Forgot-password sends no email; the link prints in the server console. | Scrum Master | **Open** | Decision C3: console links for the demo; listed in the release checklist. |
| IMP-10 | 2026-11-02 | Module View controls are not in the rights catalogue; module access is undecided. | Scrum Master | **Open** | Decision C1. Sales and Reports also work by rights only. |
| IMP-16 | 2026-11-12 | Built-screen usability review not performed. | UI/UX Designer | **Open** | S2, S3 and S4 UIX-05 files are plans; no results file changed since 2026-11-14 and 2026-11-20. Action M6. |
| IMP-17 / IMP-22 | 2026-11-13 / 2026-11-24 | Test files dated before the features merged; no commit named. | Tester | **Open** | No file under `Testing/` has changed since 2026-11-23. Sprint 4 files must carry the commit and date. |
| IMP-18 | 2026-11-13 | TC-PR-01 to 03 and TC-HR-02 expect a ticked module box to open lists. | Tester, Developer | **Open** | Depends on C1. |
| IMP-19 / IMP-24 | 2026-11-13 / 2026-11-24 | One PR per task, title `TASK-ID: short description`. | Developer, Tester | **Partly** | Sprint 4 Developer titles carry the task ID (`S4-DEV-01` to `S4-DEV-08`) but no description; see IMP-25. |
| IMP-20 | 2026-11-12 | Restore policy chosen by the Developer alone. | Developer, DB Admin | **Mitigated** | Decision C8 to record. |
| IMP-21 | 2026-11-23 | A role with nothing merged at D3 did not say so. | Developer, DB Admin | **Mitigated in Sprint 3, repeating** | See IMP-27. |
| IMP-23 | 2026-11-24 | Database messages (hire date, linked user) reached users unexplained. | Developer, DB Admin | **Mitigated** | `S3-DEV-09` (clear messages) merged in #116 on 2026-11-24 20:46. A run against a real database is not recorded; see IMP-26. |

## Raised in Sprint 4

| ID | Raised | Raised by | Impediment | Impact | Owner | Status | Next step | Resolved |
|---|---|---|---|---|---|---|---|---|
| IMP-25 | 2026-11-28 | Scrum Master | Eight Developer PRs (#120 to #127) merged within 26 minutes on 2026-11-27 (22:00 to 22:26). Titles are `S4-DEV-0N` only. #120 includes a merge of `origin` into the Developer branch; #125 holds DEV-06, the first DEV-07 and a revert of DEV-07; #126 is DEV-07 again. | Hard to review, and hard to match PRs to tasks and dates for grading; the burndown shows one step (R1). | Developer | **Open** | Write the PR description (what, migrations, tests, decisions) in each PR from now on; add the PR map to the task plan: DEV-06 in #125, DEV-07 in #126. | |
| IMP-26 | 2026-11-28 | Scrum Master | The Sprint 4 SQL (sales list and totals with `price_as_of`, payments, balances, seven reports, audit log) is verified only with stub databases and a stub server. No run against a real database is recorded. | A wrong column, type or plan shows up at the demo; report totals may differ from the database. | Developer, DB Admin | **Open** | Apply migrations 001 to 017 plus the Sprint 4 ones to a test database, load demo data, walk each screen once, and record the commit and date. | |
| IMP-27 | 2026-11-28 | Scrum Master | DB Admin 0 of 6 and Tester 0 of 6 on `main`. No Sprint 4 migration exists, so totals, balances and report figures are computed in application SQL, and there is no Sales demo data. | Risk of two sources of truth for totals; the demo has nothing to show; tests cannot be written against data. | DB Admin, Tester | **Open** | Action M1 and M3; say today if blocked. | |
| IMP-28 | 2026-11-28 | Scrum Master | The Sprint 3 decision meeting (C1 to C9) has no record in the repository, and the build added D1 to D11 (payment right, overpayment, quantity, receipt number, number format, currency, report list, active employee, Top N, deleting a sale with payments, audit detail). | Interim choices can become the final choice by default; demo questions cannot be answered. | Scrum Master, all | **Open** | Action M4, decision meeting on D3. | |
| IMP-29 | 2026-11-28 | Scrum Master | Design and build differ: wireframes use `$` and `T-001` style numbers and sample totals (`$884.50`, balance `$84.50`); the build uses peso (₱) and `TR000125` numbers. | The demo may look wrong against the approved design; the usability review will flag it. | UI/UX Designer, Developer | **Open** | Action M7. | |
| IMP-30 | 2026-11-28 | Scrum Master | A sale that has active payments cannot be deleted from the screens, because deleting and restoring a payment is not part of any Sprint 4 task. | A demo of delete on a paid sale ends at the blocked message. | Team | **Open** | Decision D10: accept and document, or add a small task. | |

## Summary at last update

- Logged in Sprint 4: 6 (IMP-25 to IMP-30) · Open: 6
- Carried and still open: 6 distinct (IMP-09, IMP-10, IMP-16, IMP-17/22, IMP-18, IMP-19/24 partly) · Mitigated: 3 (IMP-20, IMP-21, IMP-23)
- Total open: 12 (counting merged pairs once)
- Last updated: 2026-11-28 (before D1). Update on D3, D5 and D8.
