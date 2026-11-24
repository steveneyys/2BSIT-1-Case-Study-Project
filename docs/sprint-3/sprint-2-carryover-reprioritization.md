# Sprint 2 Carry-over, Re-prioritized (S3-SM-02)

**Sprint:** 3 · **Facilitator:** Scrum Master · **Checked against:** the repository (`main`, 2026-11-24, after PR #115)

Priority uses **Must** (blocks a safe demo or a grade item), **Should** (do this sprint if capacity allows), **Could** (only if spare time) and **Drop** (recommend removing). Status values: **Done**, **Partly**, **Open**, **To confirm**. "Evidence" is something anyone can look at in the repository. The priorities are the Scrum Master's proposal; the team decides at the decision meeting (section 4).

## 1. Carry-over items from the Sprint 2 review

| # | Item | Status on 2026-11-24 | Evidence | Priority | Owner | Proposed handling |
|---|---|---|---|---|---|---|
| C1 | Module View controls (5) undecided (IMP-10) | **Open** | `004_seed_reference.sql` has the five modules but no module-level View right. The HR screens use rights only: any employee right, or View Job History, opens Employees (S3-DEV-08). | **Must** (decide before Sprint 4 adds Sales and Reports) | DB Admin, Developer | Confirm the interim rule (any right in a module opens it) and write it in the rules guide. Then settle C7. |
| C2 | Disapproved status and action | **Open** | No migration 012 to 016 adds it. | **Drop** (or Could in Sprint 4) | Team | Drop unless the instructor requires it; one line in the review. |
| C3 | Real email delivery (IMP-09) | **Open** | Not in any Sprint 3 PR. | **Could** | Team | Keep console links for the demo; put the note in the release checklist (S4-SM-03). |
| C4 | Key rotation (exposed Supabase key and database password) | **To confirm** | No statement of rotation in the repository. | **Must** (security) | Developer | Reply "rotated" with the date in the next PR notes. |
| C5 | Built-screen usability review: S2-UIX-05 and S3-UIX-05 | **Open** | `wireframe/S2-UIX-05/review-results.md` still says "Pending". `S3-UIX-05` README says "Usability testing has not yet been completed". The S2 review checklist has some boxes ticked although its heading says all items stay unchecked until reviewed. | **Must** (the HR screens are now built) | UI/UX Designer | One review session on the merged `main` covering Customers, Products and HR; fill the results and fix list; reconcile the ticked boxes. |
| C6 | Test results tied to a build (IMP-17, IMP-22) | **Open** | Sprint 3 test files were merged 2026-11-23 22:01 to 22:19; the first HR screen reached `main` 2026-11-24 05:47. No file names a commit. | **Must** | Tester | Rerun on current `main`; each file states commit and date; cases that cannot run are **Blocked**, not Pass. |
| C7 | TC-PR-01 to 03 and TC-HR-02 expect "module box ticked, no rights, lists open" (IMP-18) | **Open** | `S3-TST-04` TC-HR-02 repeats the same expectation. The build opens a module only through a right. | **Must** (settle with C1) | Tester, Developer | Change the expectation, or add the View right if the team chooses so. |
| C8 | Restore rules sign-off (IMP-20) | **Partly** | `S3-TST-04` TC-HR-08 expects restore for Admin only, which matches the build. No team decision is recorded. | **Should** | Team | Record "restore is Admin only; delete blocked by active children; nothing added under a deleted parent" as decided. |
| C9 | Deleted prices cannot be viewed or restored on screen | **Open** | Job history (S3-DEV-06) does show deleted rows to Admin with Restore, so a pattern exists. | **Could** | Developer | Only if Sprint 4 has spare time. |

## 2. Follow-up of the Sprint 2 retrospective actions (S3-1 to S3-9)

| # | Action | Owner | Status | Evidence |
|---|---|---|---|---|
| S3-1 | Checkpoints: a PR or a stated blocker from every role by D3; 40% of due PRs merged by D5 | Scrum Master | **Not met** | D3: no role raised a blocker; the only PRs that day were #82 and #83 (UIX-03), reverted by #84. D5: 6 of 16 due PRs merged = 37.5%. |
| S3-2 | A migration merges before the Developer task that needs it starts | DB Admin, Developer | **Not met** | Migrations 012 to 016 merged D6 15:04 to 15:24; Developer PRs #103 to #108 merged D6 05:47 to 13:17. |
| S3-3 | Tester records build and date; rerun S2-TST-03, -04, -05 on final `main` | Tester | **Not met** | No build or commit in any S3 test file; S3-TST-05 reruns Sprint 1 and 2 but names no build. |
| S3-4 | Settle TC-PR-01 to 03 and the module access rule | Tester, Developer | **Open** | See C7. |
| S3-5 | Run the built-screen usability review (Sprint 3 D3) | UI/UX Designer | **Not met** | See C5. |
| S3-6 | Decision meeting on View controls, Disapproved, email, handoff choices, restore rules | Scrum Master, all | **Open** | No meeting record; the record table in the planning notes is blank. This document is the agenda. |
| S3-7 | One PR per task; title `TASK-ID: short description` | Developer, DB Admin | **Partly** | DB Admin PR titles follow it (`S3-DBA-01: ...`). Developer: #104 "Added joblist", #106 holds DEV-04 and DEV-05, #107 "changes for pull request". |
| S3-8 | Confirm the exposed keys were rotated | Developer | **To confirm** | See C4. |
| S3-9 | Write the reviewer for each role in the working agreement | Scrum Master | **Open** | `team-rules-and-role-guide.md` still says only "Review within 24 hours". Proposed pairs: Developer reviewed by DB Admin, DB Admin by Developer, Tester by Developer, Designer by Tester, Scrum Master by Designer. |

**Summary:** 0 Done, 1 Partly, 4 Not met, 3 Open, 2 To confirm (9 actions). Sprint 2's actions were set with owners but still had no mid-sprint follow-up; that is the Scrum Master's gap and is repeated in the Sprint 3 retrospective actions.

## 3. Proposed order of work for the rest of Sprint 3 (D7 to D10)

1. **D7:** Tester reruns the HR cases on current `main` and records the commit (C6). Designer starts the review on the merged build (C5). Developer confirms key rotation (C4).
2. **D7:** Decision meeting, 20 minutes (C1, C2, C3, C7, C8). Scrum Master records the answers in `sprint-3-planning-and-board.md` section 8.
3. **D8:** DB Admin merges S3-DBA-06 (indexes, backup and restore script). Developer fixes anything the rerun finds, with one PR per fix.
4. **D9:** Retest of fixes; Designer's fix list handed over; Scrum Master updates the burndown and impediment log.
5. **D10:** Sprint review and retrospective (S3-SM-05).

## 4. Decision meeting agenda (20 minutes)

| Item | Question | Answer |
|---|---|---|
| C1 + C7 | Does a module open for anyone holding any right in it (current build)? If yes, fix TC-PR-01 to 03 and TC-HR-02. | ____ |
| C2 | Drop the Disapproved status? | ____ |
| C3 | Console links for the demo, or an SMTP account? | ____ |
| C4 | Keys rotated? Date. | ____ |
| C8 | Confirm the restore rules. | ____ |
| S3-9 | Confirm the reviewer pairs. | ____ |
