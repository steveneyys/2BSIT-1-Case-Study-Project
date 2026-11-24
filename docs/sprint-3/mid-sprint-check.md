# Sprint 3 – Mid-Sprint Check

**Task:** S3-SM-03 · **Sprint:** 3 (Weeks 5–6) · **Facilitator:** Scrum Master

> Part 1 is the **check point** (end of D5, Mon 2026-11-23), rebuilt from the merge dates in the repository. Part 2 is the **update at the end of D6** (Tue 2026-11-24), when this was written. The check was due on D5 and is late; the numbers are what a check on D5 would have shown.

## 1. Sprint goal

People who hold the right can manage departments, jobs, employees and job history; an employee profile shows a job timeline; salary and job history are visible only with the View Job History right.

## 2. Progress at the check point (end of D5, Mon 2026-11-23)

| Role | Planned PRs | Due by D5 | Merged | Not started on `main` | Notes |
|---|---|---|---|---|---|
| Developer | 8 | 4 (DEV-01 to 04) | 0 | 8 | No Developer PR on `main`. |
| DB Admin | 6 | 3 (DBA-01 to 03) | 0 | 6 | No migration for HR on `main`. |
| Tester | 6 | 2 (TST-01, 02) | 6 | 0 | All six test files merged on D5 evening, 22:01 to 22:19 (see IMP-22). |
| UI/UX Designer | 5 | 4 (UIX-01 to 04) | 5 | 0 | Wireframes, timeline design and handoff merged D4; UIX-05 is a review plan only. |
| Scrum Master | 5 | 3 (SM-01 to 03) | 0 | 5 | Documents late (this batch). |
| **Team total** | **30** | **16** | **11** | **19** | **6 of 16 due PRs merged (37.5%); 11 of 30 in all (37%).** |

**Pace check:** the Sprint 3 target was 40% of due PRs merged by D5. The sprint reached 37.5%, just under. It is much better than Sprint 2 at the same point (3 of 15 due PRs; 27 PRs left against 15 planned). Sprint 3 had 19 left against 14 planned, a gap of 5 (Sprint 2: 12). However, **the 11 merged PRs were Designer and Tester documents; the build itself (Developer and DB Admin) had not reached `main`.**

## 3. What was going well at the check point

- The Designer's wireframes, timeline design and handoff were on `main` by D4, before any build was on `main`. Sprint 4 designs were also merged on D5 (S4-UIX-01 to 05).
- Sprint 1 and 2 foundations (sign-in, rights, audit trail, soft delete, price history) were reused without rework.
- The Tester produced the full Sprint 3 test set and checklist in one evening.

## 4. What was not going well at the check point

- **Developer and DB Admin had nothing on `main` by D5** (0 of 7 due), and no blocker was raised (IMP-21).
- **Test results were recorded before the screens were on `main`** (IMP-22): 36, 37 and 24 cases and 223 regression checks, all Pass, with "no bugs found". The first HR screen reached `main` on D6 at 05:47.
- **The usability review is still a plan** (IMP-16), now for two sprints.
- **Sprint 2 follow-ups were still open**: key rotation, the module access decision, the Disapproved status, email delivery.

## 5. Update at the end of D6 (Tue 2026-11-24)

| Role | Planned PRs | Merged | Notes |
|---|---|---|---|
| Developer | 8 | 8 | DEV-01 to 08 merged on D6 (PRs #103 to #108, #114, #115). Four due D2 to D5 arrived 1 to 4 days late. |
| DB Admin | 6 | 5 | Migrations 012 to 016 merged D6 15:04 to 15:24. S3-DBA-06 (indexes and backup/restore) open, due D9. |
| Tester | 6 | 6 | No change; results need a rerun on the merged build. |
| UI/UX Designer | 5 | 5 | Built-screen review not done. |
| Scrum Master | 5 | 0 | Written in this batch. |
| **Team total** | **30** | **24** | **24 of 30 merged (80%); 6 open.** |

**Pace check at D6:** 6 left against 12 planned, so the sprint is **ahead of the plan on count** and the goal is built. The build merged in one day (13 tasks in 12 PRs on D6), so the last four days are for verification, not new features: rerun the tests on `main`, run the usability review, fix what they find.

## 6. Actions from this check

| # | Action | Owner | Due |
|---|---|---|---|
| M1 | Rerun the HR cases on current `main`; record commit and date in each file | Tester | D7–D8 |
| M2 | Apply migrations 012 to 016 to a test database and run the HR flows against them (IMP-23) | Developer, DB Admin | D7 |
| M3 | Run the usability review on the merged build (S2-UIX-05 and S3-UIX-05) | UI/UX Designer | D8 |
| M4 | Decision meeting (see `sprint-2-carryover-reprioritization.md` section 4) | Scrum Master, all | D7 |
| M5 | Merge S3-DBA-06 | DB Admin | D9 |
| M6 | PR titles `TASK-ID: short description`, one task per PR | Developer, Tester | now |
