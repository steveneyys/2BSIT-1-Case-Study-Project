# Sprint 4 – Mid-Sprint Check

**Task:** S4-SM-02 · **Sprint:** 4 (Weeks 7–8) · **Facilitator:** Scrum Master

> **Early version, written Sat 2026-11-28 (before assumed D1).** The check point is the end of D5 (Mon 2026-12-07). Part 1 is the state today, rebuilt from the merge dates in the repository (`git log` on `main`, last commit e8a4c2c, PR #127). Part 3 is the table to refresh on D5 and D8 with the same method; copy the numbers, change the date, and update the impediment log. Nothing in Part 3 has been filled in on the team's behalf.

## 1. Sprint goal

People who hold the right can record sales with line items priced as of the sale date, record payments and see balances, and print the seven reports; delete and restore follow the rules; only a Superadmin opens the audit viewer.

## 2. Progress today (Sat 2026-11-28, before D1)

| Role | Planned PRs | Due by D5 (assumed) | Merged | Open | Notes |
|---|---|---|---|---|---|
| Developer | 8 | 4 (DEV-01 to 04) | 8 | 0 | DEV-01 to 08 merged 2026-11-27 22:00 to 22:26 (PRs #120 to #127). |
| DB Admin | 6 | 3 (DBA-01 to 03) | 0 | 6 | No Sprint 4 migration on `main`; the latest is 017 (S3-DBA-06, #117, 2026-11-25). |
| Tester | 6 | 2 (TST-01, 02) | 0 | 6 | Nothing started on `main`. The build they test is on `main` now. |
| UI/UX Designer | 5 | 4 (UIX-01 to 04) | 5 | 0 | Merged 2026-11-23 and 2026-11-24. UIX-05 is a review plan, not a review. |
| Scrum Master | 5 | 2 (SM-01, 02) | 0 | 5 | In this batch. |
| **Team total** | **30** | **15** | **13** | **17** | **13 of 30 merged (43%). Of the 15 tasks due by D5, 8 are merged (53%).** |

**Pace check.** The target is 40% of due PRs merged by D5. On count the sprint is already above it, but the count hides the shape: **all 13 merged tasks are Developer and Designer work.** DB Admin, Tester and Scrum Master have 0 of 17. The build is done before its migrations (R2), before its tests (R3) and before any demo data.

## 3. Checkpoints (refresh on the day)

| When | Checkpoint | State | Result on the day |
|---|---|---|---|
| D2 Wed 12-02 | DB Admin has merged the migrations the first Developer tasks need | Missed in advance: the Developer tasks merged first, no migration is on `main` | ____ |
| D3 Thu 12-03 | Every role has a PR on `main` or a stated blocker | Developer and Designer yes; DB Admin, Tester, Scrum Master: no blocker posted yet | ____ |
| D5 Mon 12-07 | At least 40% of due PRs merged, and at least 2 Developer PRs | Both already true on count (53%, 8 Developer PRs) | ____ |
| D8 Thu 12-10 | All Developer PRs merged except the last | Already true | ____ |

Refresh table for D5 and D8:

| Role | Planned | Due by that day | Merged | Not on `main` |
|---|---|---|---|---|
| Developer | 8 | ____ | ____ | ____ |
| DB Admin | 6 | ____ | ____ | ____ |
| Tester | 6 | ____ | ____ | ____ |
| UI/UX Designer | 5 | ____ | ____ | ____ |
| Scrum Master | 5 | ____ | ____ | ____ |
| **Team** | **30** | ____ | ____ | ____ |

## 4. What is going well

- All eight Developer tasks are on `main` with automated tests; the rights matrix test was extended to the sales, payments, balances, reports and audit routes, and the full suite was 408 tests locally when DEV-08 was packaged. Confirm with `npm test` on `main`.
- The designs were merged before the build, and the Developer built to them (sales entry, payments and balances, seven reports, audit viewer).
- Server-side rules from earlier sprints were reused: rights on every route, soft delete with Status and Stamp, Admin-only restore, salary hidden without View Job History (also in the Employee Job History report).
- Sprint 3 closed with all 30 PRs merged.

## 5. What is not going well

- **DB Admin, Tester and Scrum Master have nothing on `main`** (IMP-27, IMP-21 pattern). The last four sprint tasks for the DB Admin are the ones the demo depends on: views, checks and demo data.
- **The Sprint 4 SQL has not been run against a real database** (IMP-26). The tests use stub databases and a stub web server. The first real run is the moment a mistake shows.
- **Open decisions** D1 to D11 and C1 to C9 have no meeting record (IMP-28).
- **Design and build disagree** on currency, transaction numbers and the sample totals (IMP-29).
- **Traceability slipped again** (IMP-25): eight PRs in 26 minutes, titles with the task ID but no description, one PR holding two tasks and a revert.
- **Usability review still has not been run** on any built screen (IMP-16).

## 6. Actions from this check

| # | Action | Owner | Due |
|---|---|---|---|
| M1 | Merge the Sprint 4 migrations (views, delete and restore checks, demo data) and apply them to a test database | DB Admin | D2 to D5 |
| M2 | Run the Sprint 4 screens against that database and fix what breaks, one PR per fix | Developer, DB Admin | D3 to D5 |
| M3 | Start S4-TST-01 now on the merged build; each file records the commit and date | Tester | D3 |
| M4 | Hold the decision meeting (20 minutes): C1 to C9 and D1 to D11, record answers in `sprint-4-planning-and-board.md` section 8 | Scrum Master, all | D3 |
| M5 | Confirm key rotation (C4) in writing | Developer | D3 |
| M6 | Run the built-screen usability review on `main` (all modules) and fill the results | UI/UX Designer | D6 |
| M7 | Align currency and number formats between design and build, or record the difference as accepted | UI/UX Designer, Developer | D5 |
| M8 | Titles `TASK-ID: short description`, one task per PR | Everyone | now |
