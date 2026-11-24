# Sprint 3 Planning Notes and Board (S3-SM-01)

**Sprint:** 3 · **Weeks:** 5–6 · **Working days:** D1 Tue 2026-11-17 to D10 Mon 2026-11-30 (Monday to Friday) · **Facilitator:** Scrum Master
**Module:** Human Resources (departments, jobs, employees, job history), from the module map in `Sprint-board.md`

> **Written late.** The planning notes were due on D1 and were produced on D6 (Tue 2026-11-24) from the task plan and the repository. The board column shows the real state at 2026-11-24 evening (end of D6). Working days assume ten Monday-to-Friday days starting the day after Sprint 2 closed (Mon 2026-11-16). Change them if your instructor's calendar differs.

## 1. Sprint goal

People who hold the right can manage departments, jobs and employees and keep each employee's job history with effective dates and salary. An employee profile shows a job timeline. Salary and job history are visible only to people who hold the View Job History right, on the screen and on the server, and an employee leaving the company (separation date) is kept separate from a deleted record.

## 2. Capacity and commitment

| Role | Planned PRs | Notes |
|---|---|---|
| Developer | 8 | S3-DEV-01 to S3-DEV-08 |
| DB Admin | 6 | S3-DBA-01 to S3-DBA-06 |
| Tester | 6 | S3-TST-01 to S3-TST-06 |
| UI/UX Designer | 5 | S3-UIX-01 to S3-UIX-05 |
| Scrum Master | 5 | S3-SM-01 to S3-SM-05 |
| **Team total** | **30** | Same as Sprints 1 and 2 (velocity 30). |

One task is one PR. Branches: one per role (Developer, DB-Admin, Tester, UI/UX-design, Scrum-Master). Nobody pushes to `main`. PR title: `TASK-ID: short description`.

## 3. Carry-over from Sprint 2 (decide at planning)

Full list with evidence and priority: `sprint-2-carryover-reprioritization.md` (S3-SM-02).

| # | Item | Proposed handling in Sprint 3 | Decision owner |
|---|---|---|---|
| C1 | Module View controls (5): where stored, do they gate module access? | The HR screens use rights only (any employee right, or View Job History, opens Employees). Team confirms. | DB Admin, Developer |
| C2 | Disapproved status and action | Decide: add in Sprint 4 or drop. | Team |
| C3 | Real email delivery (SMTP) | Console links stay for the demo unless a team SMTP account exists. | Team |
| C4 | Key rotation | Developer confirms in writing. | Developer |
| C5 | Built-screen usability review (S2-UIX-05 and S3-UIX-05) | Run on the merged HR screens now that they exist. | UI/UX |
| C6 | Test evidence tied to a build | Every test file states the commit and date tested; rerun on `main`. | Tester |

## 4. Dependencies and order of work

| Needed first | Needed by | Why |
|---|---|---|
| S3-DBA-01 views (D2) | S3-DEV-03, S3-DEV-07 | Current job and timeline come from these views. |
| S3-DBA-02 job history validation (D4) | S3-DEV-06 | The form must match the database rules. |
| S3-DBA-04 child delete checks (D6) | S3-DEV-01, -02, -05 | Delete must be blocked while active children exist. |
| S3-UIX-01 to S3-UIX-04 (D2–D5) | S3-DEV-01 to S3-DEV-08 | Build to the approved design. |
| S3-DEV-01 to S3-DEV-08 | S3-TST-01 to S3-TST-06, S3-UIX-05 | Tests and the usability review need the built screens. |

## 5. Stories, acceptance criteria and board (state at end of D6, Tue 2026-11-24)

Planned day is the working day the task is due in the task plan. **24 of 30 tasks are merged; 6 are open** (S3-DBA-06 and the five Scrum Master tasks).

| ID | Acceptance criteria | Planned day | Board |
|---|---|---|---|
| S3-DEV-01 | Department list with search; Add and Edit (code 2–3 characters, unique, read-only after creation; name up to 20); delete blocked while active job history exists; Admin sees Inactive rows and restores. | D2 11-18 | Merged D6 11-24 · #103 |
| S3-DEV-02 | Same for jobs (code 2–4 characters, description up to 20); delete blocked while active job history exists. | D3 11-19 | Merged D6 11-24 · #104 (titled "Added joblist") |
| S3-DEV-03 | Employee list with number, name, gender, birth, hire and separation dates; search by number or name; filters; Admin tabs with Status and Stamp; users see active rows only; no salary in the list. | D4 11-20 | Merged D6 11-24 · #105 |
| S3-DEV-04 | Add and Edit form: number unique and read-only after creation; names up to 15; gender M/F; hire date after birth date; separation date optional and not before hire date; errors beside the field. | D5 11-23 | Merged D6 11-24 · #106 (with DEV-05) |
| S3-DEV-05 | Delete with confirmation, blocked while active job history or sales exist; Admin restores; separation date is separate from a deleted record. | D6 11-24 | Merged D6 11-24 · #106 (with DEV-04) |
| S3-DEV-06 | Add, edit, delete and restore job history rows (job, department, effective date, salary); one row per effective date; date not before hire date; salary 0 to 99,999,999.99. | D7 11-25 | Merged D6 11-24 · #108 |
| S3-DEV-07 | Profile with personal details and a job timeline; current job is the latest row that has started; timeline and salary only with the View Job History right. | D8 11-26 | Merged D6 11-24 · #114 |
| S3-DEV-08 | Job history and salary visible only with View Job History (screen and server); view-only users cannot change anything; write replies never echo salary. | D9 11-27 | Merged D6 11-24 · #115 |
| S3-DBA-01 | Views for current job and department and the job timeline. | D2 11-18 | Merged D6 11-24 · #109 |
| S3-DBA-02 | Database refuses a second live job history row for the same employee and date, and a date before the hire date. | D4 11-20 | Merged D6 11-24 · #110 |
| S3-DBA-03 | app_user.empno links a user account to an employee. | D5 11-23 | Merged D6 11-24 · #111 |
| S3-DBA-04 | Employee, department or job with active children cannot be deleted; nothing can be added under a deleted parent. | D6 11-24 | Merged D6 11-24 · #112 |
| S3-DBA-05 | Enough HR rows to demo search, paging, current job, a separated employee and a deleted row. | D7 11-25 | Merged D6 11-24 · #113 |
| S3-DBA-06 | Indexes reviewed; a backup and restore script that works from a clean database. | D9 11-27 | To do |
| S3-TST-01 | Every department and job story has a case with expected result; results recorded. | D3 11-19 | Merged D5 11-23 · #96 |
| S3-TST-02 | Same for employees (list, search, form, delete and restore, separation). | D5 11-23 | Merged D5 11-23 · #97 |
| S3-TST-03 | Job history cases: effective date, salary rules, current job, delete and restore. | D7 11-25 | Merged D5 11-23 · #98 |
| S3-TST-04 | Each of the 13 HR rights checked as menu, button and server; salary hidden without View Job History. | D8 11-26 | Merged D5 11-23 · #99 |
| S3-TST-05 | Sprint 1 and 2 cases rerun on the merged build; no new failures. | D9 11-27 | Merged D5 11-23 · #100 |
| S3-TST-06 | Every bug has severity and status; no open Critical or High at the end. | D9 11-27 | Merged D5 11-23 · #101 |
| S3-UIX-01 | Department and job wireframes: list, form, delete and restore states. | D2 11-18 | Merged D4 11-20 · #85 |
| S3-UIX-02 | Employee list, form and profile wireframes. | D3 11-19 | Merged D4 11-20 · #86 |
| S3-UIX-03 | Job timeline component and job history form designed. | D4 11-20 | Merged D4 11-20 · #87, #88 (first try #83 reverted by #84) |
| S3-UIX-04 | Hi-fi mockups and handoff notes the Developer can build from without asking. | D5 11-23 | Merged D4 11-20 · #89, #90 |
| S3-UIX-05 | Review run on the built HR screens; fix list written. | D9 11-27 | Merged D4 11-20 · #90 (review plan only) |
| S3-SM-01 | This document. | D1 11-17 | To do |
| S3-SM-02 | Each Sprint 2 carry-over item has a status, a priority and an owner. | D3 11-19 | To do |
| S3-SM-03 | Progress by role at D5; impediments with owners. | D5 11-23 | To do |
| S3-SM-04 | Velocity table, burndown from real merge dates, Sprint 4 risk register. | D8 11-26 | To do |
| S3-SM-05 | Goal result, demo, actions for Sprint 4. | D10 11-30 | To do |

## 6. Risks identified at planning (and what happened)

| Risk | Plan | What happened |
|---|---|---|
| Developer tasks wait on database migrations (IMP-15 again). | DB Admin merges the migration a story needs before the Developer task starts. | Not met: migrations 012 to 016 merged on D6 15:04–15:24, after Developer PRs #103 to #108 (see IMP-23). |
| Work piles up at the end (IMP-14). | Every role has a PR or a stated blocker by D3; 40% of due PRs merged by D5. | Partly met: 6 of 16 due PRs (37.5%) at D5. Developer and DB Admin had 0 (see mid-sprint check). |
| Tests recorded before the feature is merged (IMP-17). | Tester records the build and date tested. | Not met (IMP-22). |
| Traceability (IMP-19). | One PR per task. | Not met (IMP-24). |

## 7. Definition of Done

Unchanged from `team-rules-and-role-guide.md` (criteria 1–9), including "permission checks are enforced on the server" and "no secrets in the repo".

## 8. Meeting record

| Item | Value |
|---|---|
| Planning meeting date | ____ |
| Attendees | ____ |
| Decisions on C1–C6 | ____ |
