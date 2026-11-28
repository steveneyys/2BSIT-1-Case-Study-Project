# Hope, Inc. ERP – Project Report

**Task:** S4-SM-05 (part 2) · **Course project:** 2BSIT-1 Case Study · **Prepared by:** Scrum Master · **Status: DRAFT of Sat 2026-11-28, final version due D10 (Mon 2026-12-14)**

> Built from the three sprint reviews, the sprint documents in `docs/`, the wireframes, the migrations and `git log` on `main`. Sprint 4 is not finished: figures for it are as of 2026-11-28 and fields marked `____` are for the team to fill. No grade, stakeholder remark or opinion has been written on anyone's behalf.

## 1. Summary

Hope, Inc. ERP is a web application for a small trading company: it handles people and their rights, customers, products and prices, employees and their job history, sales and payments, reports, and an audit trail. It was built in four two-week sprints by a five-role student team (Developer, DB Admin, Tester, UI/UX Designer, Scrum Master) with one branch per role and one pull request per task.

| Sprint | Weeks | Theme | Planned PRs | Merged | Velocity |
|---|---|---|---|---|---|
| 1 | 1–2 | Users, sign-in, rights, main page | 30 | 30 | 30 |
| 2 | 3–4 | Customers, products, price history, soft delete | 30 | 30 | 30 |
| 3 | 5–6 | Human Resources: departments, jobs, employees, job history | 30 | 30 | 30 |
| 4 | 7–8 | Sales, payments, balances, reports, audit viewer | 30 | 13 (as of 2026-11-28) | ____ |

## 2. What the system does

| Area | Capabilities |
|---|---|
| Accounts and rights | Register with Pending approval; set a password through a one-time link; sign in with throttling, Remember me and Google; forgot password; User Management; per-user rights; roles Superadmin, Admin and User |
| Customers and products | Search, filter, page, add, edit; soft delete with Status and Stamp; Admin restore; delete blocked while active children exist; price history with effective dates (current, scheduled, past) |
| Human Resources | Departments, jobs, employees (separation date kept apart from deletion), job history with salary; profile with job timeline; salary and history only with the View Job History right |
| Sales | Sales list and header; line items priced on the sale date; totals; payments and balances per sale and per customer; delete blocked by active children; Admin restore |
| Reports | Seven reports: product master, active employees, all employees, employee job history, top customers, top products, top sales; date range and Top N; Print and Save as PDF |
| Audit | Every add, edit, delete and restore recorded by the database; Superadmin-only viewer with filters and changed fields; credentials hidden |
| Operations | Migrations, superadmin seed, database check, backup and restore scripts |

## 3. How it is built

| Layer | Choice |
|---|---|
| Runtime and framework | Node.js 20, Express 4; plain HTML, CSS and JavaScript in `public/` (no front-end framework; all text inserted with `textContent`) |
| Database | PostgreSQL on Supabase; migrations 001 to 017 in `db/migrations` (Sprint 4 migrations still to merge) |
| Layers in `src/` | `routes` (HTTP and rights gate), `services` (rules and permissions), `repositories` (SQL), `validators` (input rules) |
| Security | Server-side check of the right on every route; page guard for HTML pages; session cookie; the audit user is set per transaction so triggers record who acted; salary and job history never leave the server without the right |
| Soft delete | `is_deleted` flag plus a `stamp` text; `*_active` views; triggers block deleting a parent with active children and adding under a deleted parent |
| Prices | A price is the latest one in force on a date (`price_as_of`); a sale line has no price column, so a price can never drift from the price history |
| Testing | `node --test`; 93 tests at the end of Sprint 1, 165 at Sprint 2, 260 at Sprint 3, 408 in the local suite when Sprint 4's last Developer task was packaged (confirm with `npm test` on `main`); a rights matrix test locks the right needed by each change route |
| Process | Branch per role, PR per task titled `TASK-ID: short description`, review, Definition of Done in `team-rules-and-role-guide.md`, PR and issue templates |

## 4. How the team worked (from the data)

| Measure | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 (as of 2026-11-28) |
|---|---|---|---|---|
| Planned / merged | 30 / 30 | 30 / 30 | 30 / 30 | 30 / 13 |
| Merged by the D5 check | 28 by the check | 3 of 15 due | 6 of 16 due (37.5%) | 8 of 15 due (53%), all Developer and Designer |
| Shape of the burndown | Late close | Step on D9 | Step on D6 (13 tasks) | Step on 2026-11-27 (8 tasks in 26 minutes) |
| Impediments logged | IMP-01 to 20 (Sprints 1 and 2) | (see left) | IMP-21 to 24 | IMP-25 to 30 so far |

**Pattern across sprints:** designs arrive first, the build arrives in one day, migrations and tests arrive after or before the build but not with it, and Scrum Master documents are written late from the repository. Detail: `docs/sprint-3/velocity-and-burndown.md`, `docs/sprint-4/velocity-and-burndown.md`, the impediment logs.

## 5. Quality and verification

| Item | Status |
|---|---|
| Developer unit tests | Pass locally; the suite includes the rights matrix and service tests with stub databases |
| Tester results | Sprints 1 to 3 recorded (all Pass, 0 open bugs); **dated before the screens they test for Sprints 2 and 3 (IMP-17, IMP-22)**; Sprint 4 files not yet written |
| Run against a real database | Sprints 1 to 3: used during development; Sprint 4: **not yet recorded (IMP-26)** |
| Usability review of built screens | **Not performed** for any sprint (IMP-16); review plans exist |
| Security review | Server-side rights on every route; secrets kept out of the repository; key rotation (C4) to confirm |
| Final sign-off | S4-TST-06 (commit and date) ____ |

## 6. Decisions and trade-offs

| Decision | Choice | Why | Cost |
|---|---|---|---|
| Rights without module View controls (C1) | Any right in a module opens it | No module-level right in the catalogue | A module box alone opens nothing |
| Soft delete only | Flag and stamp; Admin-only restore; no cascade | Keeps history and audit | Blocked deletes must be resolved by hand |
| Price derived by date | No price column on sale lines | One source of truth | A sale before the first price cannot be saved |
| Payments right (D1) | Sales-list rights to view, `SALE_EDIT` to record | No payment right in the catalogue | Coarser than a dedicated right |
| Overpayment refused (D2) | Balance cannot go below zero | Keeps balances meaningful | Refunds need a separate process |
| Audit viewer | Role check (Superadmin), not a right | An audit right was not in the plan | Cannot be delegated to one Admin |
| Email | Links in the server console (C3) | No SMTP account | Not usable by real users |

## 7. Known limitations

- No real email delivery; no Disapproved status; deleted prices cannot be viewed.
- A sale with active payments cannot be deleted from the screens: payment delete and restore is not built.
- Sprint 4 totals and reports are computed in application queries until the S4-DBA views are merged.
- The audit trail has no "result" or "request reference" fields; it cannot say that an action was refused.
- Design samples use dollars and `T-001` numbers; the build uses pesos and `TR000125` numbers.

## 8. Lessons learned

1. **Checkpoints need a report, not only a date.** Three sprints had a D3 checkpoint; nobody reported on it, and the build still arrived in one day.
2. **A migration must merge before the code that needs it**, or the code needs a second pass.
3. **Evidence must name the build.** A test result without a commit cannot be trusted later.
4. **Write decisions down the day they are made.** Interim choices became final by default.
5. **Small, titled PRs make grading and review possible**; a PR with two tasks and a revert does not.
6. **Design handoffs must say which format wins** (currency, number format, sample data).

## 9. Future work

| Item | Notes |
|---|---|
| Real email delivery (SMTP) | Replace console links |
| Payment delete and restore; a dedicated payment right | Allows deleting a paid sale after resolving payments |
| Audit right and richer audit data (result, request id) | Extend `audit_log` |
| View and restore deleted prices | Follows the job history pattern |
| Move totals, balances and report queries into database views | S4-DBA-01 to 03 |
| Disapproved account status | If the instructor requires it |
| Module View controls | If the team wants module-level access |
| Automated browser tests | Replace the manual end-to-end walk |

## 10. Document index

| Document | Where |
|---|---|
| Rules, Definition of Done, role guide | `team-rules-and-role-guide.md` |
| Sprint 1, 2, 3 reviews, mid-sprint checks, impediment logs, burndowns | `docs/sprint-1` to `docs/sprint-3` |
| Sprint 2 carry-over and Sprint 4 risk register | `docs/sprint-3/` |
| Sprint 4 planning and board, mid-sprint check, impediment log | `docs/sprint-4/` |
| Release checklist and demo script | `docs/sprint-4/release-checklist-and-demo-script.md` |
| Peer evaluation form and tracker | `docs/sprint-4/final-peer-evaluations.md` |
| Sprint 4 review and retrospective | `docs/sprint-4/sprint-review-retrospective.md` |
| Wireframes and mockups | `wireframe/` |
| Test plans, cases and results | `Testing/` |
| Migrations and scripts | `db/migrations`, `scripts/` |

## 11. Sign-off

| Role | Name | Date |
|---|---|---|
| Developer | ____ | ____ |
| DB Admin | ____ | ____ |
| Tester | ____ | ____ |
| UI/UX Designer | ____ | ____ |
| Scrum Master | ____ | ____ |
