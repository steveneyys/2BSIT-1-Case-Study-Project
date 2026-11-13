# Sprint 2 – Impediment Log

**Task:** S2-SM-03 · Continues the Sprint 1 log (IMP-01 to IMP-13). An impediment is anything that slows or stops someone; the Scrum Master's job is to get it removed. Dates are `YYYY-MM-DD`. Owner is a role.

## Carried over from Sprint 1

| ID | Raised | Impediment | Owner | Status | Next step |
|---|---|---|---|---|---|
| IMP-09 | 2026-11-02 | Forgot-password sends no email; the link prints in the server console. | Scrum Master | **Open** | Decide: SMTP account for the team, or console links for the demo. |
| IMP-10 | 2026-11-02 | Module View controls are not in the rights catalogue; module access is undecided. | Scrum Master | **Open** | Interim rule in the build: any right in a module opens it. Team to confirm (see IMP-18). |

## Raised in Sprint 2

| ID | Raised | Raised by | Impediment | Impact | Owner | Status | Resolution / next step | Resolved |
|---|---|---|---|---|---|---|---|---|
| IMP-14 | 2026-11-10 | Scrum Master | Work arrived late: by D5 only 3 of 15 due PRs were merged, and by D6 still 3 of 17 due. 19 PRs merged on D7 and D8. | Little time left for testing and review | Scrum Master | Mitigated | Everything merged by D9 with no open Critical or High bug. For Sprint 3: each role posts progress by D3, and a role with nothing merged by D5 raises it that day. | 2026-11-13 |
| IMP-15 | 2026-11-09 | Developer | Database migrations (views, indexes, price query, validation, child checks) were due D2 to D9 but none merged before D7 (the three due by D5 merged on D7). | Developer built lists and forms in one stretch on D8 and D9 | DB Admin | Resolved | Migrations 007 to 011 merged on 2026-11-11 and 2026-11-12. For Sprint 3: DB Admin merges the migration a story needs before that story's Developer task starts. | 2026-11-12 |
| IMP-16 | 2026-11-12 | Scrum Master | The built-screen usability review (S2-UIX-05) is marked "Pending": review information and results are empty and no issues are recorded. The Sprint 1 action to repeat the review is still open. | Design and build differences could go unnoticed (as in IMP-11) | UI/UX Designer | **Open** | Designer reviews the final build and fills `review-results.md` and `fix-list.md`. Due Sprint 3 D3. | |
| IMP-17 | 2026-11-13 | Scrum Master | Test files for soft delete, price rights and regression are dated 2026-11-12 around 15:00; the soft-delete, product and price features merged later that day and on 2026-11-13. | Pass results may have been recorded on a local or earlier build | Tester | **Open** | Tester confirms which build was tested, or reruns S2-TST-03, -04 and -05 on the final `main` and records the date and build. | |
| IMP-18 | 2026-11-13 | Scrum Master | Test cases TC-PR-01 to TC-PR-03 expect "module box ticked, no action rights → list opens". The build opens a module only when the person holds at least one right in it (the module box is not saved on its own). | Possible wrong Pass, or a wrong expectation | Tester, Developer | **Open** | Tester and Developer check the three cases on the final build. Either fix the expectation or add the View right (IMP-10 decision). | |
| IMP-19 | 2026-11-13 | Scrum Master | Traceability: S2-DEV-01 has no PR of its own (delivered with S2-DEV-02); two PRs share the title "S2-DEV-02"; most Developer commits are named only with the task ID. | Hard to match a PR to a task in the grading sheet | Developer | **Open** | From Sprint 3: one PR per task, PR title `TASK-ID: short description`. Note the DEV-01 exception in the task plan. | |
| IMP-20 | 2026-11-12 | Designer | Restore policy was not defined (design item REF-04): who restores, and what if a deleted parent still has children. | Developer had to choose a rule | Developer, DB Admin | **Open** | Built rule: only Admin and Superadmin restore; delete is blocked while active children exist; nothing can be added or restored under a deleted parent. Team confirms in the decision meeting. | |

## Summary at last update

- Logged in Sprint 2: 7 · Mitigated or resolved: 2 · Open: 5 (IMP-16 to IMP-20)
- Open from Sprint 1: 2 (IMP-09, IMP-10)
- Total open going into Sprint 3: 7
- Last updated: 2026-11-13
