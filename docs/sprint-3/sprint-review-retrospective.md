# Sprint 3 – Review and Retrospective

**Task:** S3-SM-05 · **Sprint:** 3 (Weeks 5–6) · **Facilitator:** Scrum Master

> **DRAFT written on D6 (Tue 2026-11-24).** The report is due on D10 (Mon 2026-11-30). Everything below is what the repository shows today. Fields marked `____` and the items marked **(update on D10)** must be filled in at the review and retrospective meetings; do not hand this in with them empty. Nothing in the demo or mood sections has been invented.

## Part A – Sprint Review

### 1. Sprint goal and result

**Goal:** People who hold the right can manage departments, jobs and employees and keep each employee's job history with effective dates and salary; an employee profile shows a job timeline; salary and job history are visible only with the View Job History right, and separation is kept separate from a deleted record.

**Result so far: built, not yet verified.** All eight Developer tasks and five of six DB Admin tasks are merged (24 of 30 PRs, see `velocity-and-burndown.md`). The goal can only be called **Met** after three things happen: the Tester reruns the HR cases on the merged `main` (IMP-22), the built-screen usability review is done (IMP-16), and the migration and screen behaviour are checked together (IMP-23). **(update on D10)**

### 2. What was delivered (on `main` at the end of D6)

| Area | Delivered |
|---|---|
| Departments and jobs | List with search, paging and Admin Active/Inactive/All tabs with Status and Stamp; Add and Edit (department code 2–3, job code 2–4, typed, unique, read-only after creation; name or description up to 20; names unique among live rows); delete blocked while active job history exists; Admin-only restore |
| Employees | List with number, name, gender, birth, hire and separation dates; search by number or name; gender and employed/separated filters; sorting and paging; no salary in the list; Add and Edit (number 5 digits, names up to 15, hire date after birth date, separation date optional and not before hire date); delete with confirmation, blocked by active job history or sales; separation date kept separate from a deleted record; Admin restore |
| Job history | Per-employee screen: add, edit, delete and restore rows with job, department, effective date and salary; one live row per effective date; date not before hire date; salary 0 to 99,999,999.99 with two decimals; current job is the latest row that has started (a future date is not current yet) |
| Profile | Personal details and employment state; job timeline, newest first, with current and upcoming markers |
| Rights | Employee, department and job rights per action; View Job History decides who sees job history and salary (the server never sends them without it, and write replies do not echo a salary); a rights matrix test covers every change route |
| Database | Migrations 012 to 016: current job and timeline views, job history validation (one live row per employee and date, not before hire date), user-to-employee link, parent checks for employee, job and department, HR demo data |
| Design | Wireframes for departments, jobs, employees and profile; job timeline component; hi-fi mockups and handoff notes; usability review plan (the review itself is open) |
| Testing | Test files for departments and jobs (36 cases), employees (37), job history (24), salary and HR rights (13 rights, 17 role checks) and regression (223 checks). **Results need a rerun on the merged build (IMP-22).** |

### 3. Demo checklist (run live) **(update on D10: tick and add results)**

- [ ] Admin: open Human Resources; move between Departments, Jobs and Employees
- [ ] Employees: search by name and by number; filter by gender and by employed or separated; sort by hire date
- [ ] Add an employee; try a hire date before the birth date and see the message beside the field
- [ ] Edit an employee and set a separation date; show that the record is still Active
- [ ] Delete an employee without history; show it under Inactive; restore it
- [ ] Try to delete an employee who has job history; show the blocked message
- [ ] Open History: add a promotion with an effective date and salary; try a date the employee already has; try a negative salary
- [ ] Show the Current badge move when a later date is added, and an upcoming row for a future date
- [ ] Open the profile and show the job timeline
- [ ] Sign in as a User with only View Job History: sees employees, history and salary; no Add, Edit or Delete buttons
- [ ] Sign in as a User with Edit Employee but not View Job History: no History button; profile shows no timeline or salary
- [ ] Sign in as a User with no HR right: the module is not in the menu and the page redirects home

### 4. Not done or carried over (as of D6)

| Item | Why | Carry to |
|---|---|---|
| S3-DBA-06 indexes and backup/restore script | Due D9 | Finish this sprint |
| Rerun of all Sprint 3 test files on the merged build | Results dated before the screens merged (IMP-22) | D7–D8 |
| Built-screen usability review (S2-UIX-05, S3-UIX-05) | Plan only so far (IMP-16) | D8 |
| Migration and screen check against a real database (IMP-23) | Migrations merged after the screens | D7 |
| Module View controls, Disapproved status, email delivery, key rotation, restore sign-off | Decisions still open (`sprint-2-carryover-reprioritization.md`) | Decision meeting D7 |
| Deleted prices cannot be viewed on screen | Not in the task plan | Sprint 4 (optional) |

### 5. Stakeholder feedback

____________________________________________________________

### 6. Impediment log result

Sprint 3 logged 4 (IMP-21 to IMP-24): 1 mitigated, 3 open. Six earlier ones are still open (IMP-09, IMP-10, IMP-16, IMP-17, IMP-18, IMP-19) and one is mitigated (IMP-20). **(update on D10)**

## Part B – Retrospective (draft for the meeting)

### 7. What went well

- The Designer's wireframes, timeline design and handoff were on `main` on D4, before any build, and the Sprint 4 designs were ready on D5.
- The Developer merged all eight tasks on D6; each carried automated tests and the rights matrix test was extended to the HR routes. The suite has grown to 260 tests (165 at the end of Sprint 2); confirm with `npm test` on `main`.
- The View Job History rule is enforced on the server, not only on the screen, and write replies no longer reveal a salary.
- The database again catches what the screens miss: one live job history row per employee and date, no job history before the hire date, no records under a deleted parent.
- The gap against the plan was smaller than in Sprint 2 (widest gap +8 at D3, against +15).
- The Tester produced the whole Sprint 3 test set and checklist, including per-right checks for the 13 HR rights.

### 8. What did not go well (and why)

| Problem | Root cause |
|---|---|
| The build reached `main` in one day, D6 (IMP-21) | The D3 checkpoint ("a PR or a stated blocker from every role") was set but not run by the Scrum Master; no one posted a blocker |
| Migrations merged after the screens (IMP-23) | The rule "migration before the Developer task" had no owner and no check |
| Test results were recorded before the screens were on `main` (IMP-22) | Tests were written from the design and a local build; the files have no field for the commit tested |
| Usability review still a plan (IMP-16) | The review depends on built screens and was not rescheduled when they merged |
| PRs hard to match to tasks (IMP-24) | The title rule was announced but not enforced; two tasks in one PR; a stray PR |
| Scrum Master documents late again | The checks (D3, D5) were not run on the day; this batch rebuilt them on D6 from the repository |
| Sprint 2 actions not followed up (S3-1 to S3-9: 0 done) | No weekly follow-up date and no owner for the follow-up itself |

### 9. Actions for Sprint 4

| # | Action | Owner | Due |
|---|---|---|---|
| S4-1 | Checkpoints run on the day: D2 migrations merged, D3 every role has a PR or a blocker, D5 40% and 2 Developer PRs. The Scrum Master posts the result on the board each time | Scrum Master | Sprint 4 D2, D3, D5 |
| S4-2 | A migration merges before the Developer task that needs it; each Developer PR lists its migrations | DB Admin, Developer | ongoing |
| S4-3 | Every test file states the commit and date tested; the final sign-off lists the commit | Tester | ongoing |
| S4-4 | Usability review of Sprints 2 and 3 done by Sprint 3 D8; S4-UIX-05 covers only new screens | UI/UX Designer | Sprint 3 D8 |
| S4-5 | Decision meeting held and answers recorded (C1 to C8); key rotation confirmed | Scrum Master, all | Sprint 3 D7 |
| S4-6 | One task per PR, title `TASK-ID: short description`; no unrelated files in a task PR | Developer, Tester | ongoing |
| S4-7 | Map database error messages to clear text; run each Developer merge against a real test database once | Developer | Sprint 4 D3 |
| S4-8 | Reviewer pairs written in the working agreement | Scrum Master | Sprint 3 D8 |
| S4-9 | Weekly follow-up of the previous sprint's actions (a table with status, evidence and owner, updated each Monday) | Scrum Master | every Monday |

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
