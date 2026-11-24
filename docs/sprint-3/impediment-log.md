# Sprint 3 – Impediment Log

**Task:** S3-SM-03 · Continues the Sprint 1 and 2 logs (IMP-01 to IMP-20). An impediment is anything that slows or stops someone; the Scrum Master's job is to get it removed. Dates are `YYYY-MM-DD`. Owner is a role.

## Carried over (status updated 2026-11-24)

| ID | Raised | Impediment | Owner | Status | Next step |
|---|---|---|---|---|---|
| IMP-09 | 2026-11-02 | Forgot-password sends no email; the link prints in the server console. | Scrum Master | **Open** | Decision C3: console links for the demo, noted in the release checklist. |
| IMP-10 | 2026-11-02 | Module View controls are not in the rights catalogue; module access is undecided. | Scrum Master | **Open** | Decision C1. The HR screens work by rights only (S3-DEV-08). |
| IMP-16 | 2026-11-12 | Built-screen usability review not performed (S2-UIX-05); S3-UIX-05 is a plan only. The S2 checklist has ticked boxes while its results are "Pending". | UI/UX Designer | **Open** (was due Sprint 3 D3) | One review on the merged build covering Customers, Products and HR; fill results and fix list. Due D8. |
| IMP-17 | 2026-11-13 | Sprint 2 test files dated before the features merged. | Tester | **Open** | Merged into IMP-22. |
| IMP-18 | 2026-11-13 | TC-PR-01 to 03 expect "module box ticked, no rights → lists open"; the build needs a right. | Tester, Developer | **Open** | S3-TST-04 TC-HR-02 repeats it. Settle with decision C1. |
| IMP-19 | 2026-11-13 | Traceability: PR does not match task. | Developer | **Open** | Repeated in Sprint 3 (IMP-24). |
| IMP-20 | 2026-11-12 | Restore policy chosen by the Developer alone. | Developer, DB Admin | **Mitigated** | The Tester's TC-HR-08 expects Admin-only restore, the same as the build. Team records the decision (C8). |

## Raised in Sprint 3

| ID | Raised | Raised by | Impediment | Impact | Owner | Status | Resolution / next step | Resolved |
|---|---|---|---|---|---|---|---|---|
| IMP-21 | 2026-11-23 | Scrum Master | At the D5 check, the Developer and DB Admin had 0 of 7 due PRs on `main`, and no blocker was raised by D3. The D5 target (40% of due PRs) was missed: 6 of 16 = 37.5%. | Tester wrote tests without a build; build and checks piled into D6. | Developer, DB Admin | Mitigated | All 8 Developer PRs and 5 DB Admin PRs merged on D6. For Sprint 4: a role with nothing merged at D3 says so that day. | 2026-11-24 |
| IMP-22 | 2026-11-24 | Scrum Master | The Sprint 3 test files (S3-TST-01 to 06 and the checklist) were merged on 2026-11-23 between 22:01 and 22:19 with every case recorded as Pass (36, 37 and 24 cases, 17 role checks, 223 regression checks) and "no bugs found". The first HR screen reached `main` on 2026-11-24 at 05:47, the employee list at 13:02, job history at 13:17, the profile at 20:23. No file names the commit or build tested. | The Pass results cannot be trusted as evidence for the merged build; a real bug could be hidden. This is the same pattern as IMP-17. | Tester | **Open** | Tester says which build was tested (a local branch, for instance) or reruns every Sprint 3 file on current `main`. Each file gets a "Build tested: commit, date" line. A case that cannot be run is **Blocked**, not Pass. Due D8. | |
| IMP-23 | 2026-11-24 | Scrum Master | Migrations 012 to 016 merged D6 15:04 to 15:24, after Developer PRs #103 to #108 (D6 05:47 to 13:17); DEV-07 and DEV-08 came later still. Reading the migrations shows two database rules the screens may not explain: moving an employee's hire date later than existing job history is refused (013), and deleting an employee with a linked user account is refused (014). The screens could show a generic error for these. | Unclear error messages in the demo. | Developer, DB Admin | **Open** | Apply 012 to 016 to a test database, run the HR flows (change a hire date, delete an employee with a linked user, add a date that already exists) and map each database message to a clear text. Due D7. | |
| IMP-24 | 2026-11-24 | Scrum Master | Traceability again: DEV-02 is PR #104 titled "Added joblist"; PR #106 holds DEV-04 and DEV-05; PR #107 "changes for pull request" edits a Sprint 1 document and belongs to no task; Tester PRs are titled "Create README.md". | Hard to match PRs to tasks for grading (see IMP-19). | Developer, Tester | **Open** | Title every PR `TASK-ID: short description`. For the two merged exceptions, add a line to the task plan: DEV-04 and DEV-05 are in #106; DEV-02 is #104. | |

## Summary at last update

- Logged in Sprint 3: 4 (IMP-21 to IMP-24) · Mitigated: 1 · Open: 3
- Carried from earlier sprints and still open: 6 (IMP-09, IMP-10, IMP-16, IMP-17 (merged into IMP-22), IMP-18, IMP-19) · Mitigated: 1 (IMP-20)
- Total open: 9 (counting IMP-17 inside IMP-22: 8 distinct)
- Last updated: 2026-11-24 (D6)
