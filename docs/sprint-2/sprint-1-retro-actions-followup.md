# Follow-up of Sprint 1 Retrospective Actions (S2-SM-02)

**Sprint:** 2 · **Facilitator:** Scrum Master · **Checked against:** the repository on 2026-11-13

Status values: **Done**, **Partly**, **Open**. "Evidence" is something anyone can look at in the repository. Where the evidence cannot show the answer, the status says **To confirm** and names who confirms.

## 1. Action follow-up

| # | Sprint 1 action | Owner | Status | Evidence | Next step |
|---|---|---|---|---|---|
| R1 | One branch per role; pull `main` into it before starting a task | All | **Done** | All Sprint 2 PRs came from the five role branches (Developer, DB-Admin, Tester, UI/UX-design, Scrum-Master). No per-task branches were created. | Keep. Delete any leftover task branches. |
| R2 | Every database-touching PR has a "Depends on" section linking the migration | Developer, DB Admin | **Partly** | DB Admin PR titles name each migration (007 to 011). Developer PRs that rely on migrations should name them. | Developer and DB Admin check the Sprint 2 PR descriptions; add it from Sprint 3. |
| R3 | Run `npm test` before every push and after every merge | All | **Done** (Developer) | Automated tests grew from 93 (Sprint 1) to 165 passing, including a rights matrix test for both modules. The smoke test script was fixed (IMP-12). | Tester and DB Admin add their checks to the same habit. |
| R4 | Read the Designer's handoff; show the finished screen to the Designer before the PR | Developer, UI/UX | **Partly** | Handoffs exist for S2-UIX-02, -03 and -04. The built-screen review (S2-UIX-05) is still marked "Pending". | Developer shows the final screens to the Designer now; Designer records results (see IMP-16). |
| R5 | Decide the open Sprint 1 items and write the outcome in the planning notes | Scrum Master | **Open** | No recorded decision on module View controls, Disapproved status, email delivery or the handoff choices. The Developer applied interim rules (any right in a module opens it; console links for email; Disapproved not built). | Hold one 15-minute decision meeting; record answers in the planning notes (see section 2). |
| R6 | Confirm keys were rotated; add "no real secrets in the repo" to the Definition of Done | Developer, Scrum Master | **Partly** | Definition of Done criterion 6 covers secrets. Rotation of the exposed Supabase key and database password is not confirmed anywhere. | **To confirm** by Developer: reply "rotated" with the date. |
| R7 | Agree who reviews each PR before merge | All | **To confirm** | The working agreement says review within 24 hours. The repository does not show who approved each PR. | Team: write the reviewer for each role pair in the working agreement. |
| R8 | Repeat the usability review on the final build | UI/UX | **Open** | `wireframe/S2-UIX-05/review-results.md` says the built-screen review is "Not yet performed". | Designer runs it on the merged build and fills the table (IMP-16). |

**Summary:** 2 Done, 3 Partly, 2 Open, 1 To confirm (8 actions).

## 2. Open Sprint 1 decisions: where each one stands

| # | Decision | State at the end of Sprint 2 | Needed from the team |
|---|---|---|---|
| 1 | Module View controls (5 checkboxes) | Not stored anywhere. The build opens a module for anyone holding at least one of its rights. | Keep this rule, or add 5 View rights to the catalogue (DB Admin migration plus a small Developer change). |
| 2 | Disapproved status and action | Not built. The database allows Active, Pending, Blocked only. | Add in Sprint 3 or drop from the design. |
| 3 | Real email delivery | Not configured. Links print in the server console. | Set up an SMTP account for the demo, or agree to show console links. |
| 4 | Handoff choices (who approves, token expiry, password policy, Remember me length) | Built as: Superadmin approves; defaults for the rest. | Confirm or change. |

## 3. New actions from this follow-up

| # | Action | Owner | Due |
|---|---|---|---|
| F1 | Confirm key rotation in writing | Developer | Before Sprint 3 starts |
| F2 | Hold the decision meeting and record answers for decisions 1 to 4 | Scrum Master | Sprint 3 D1 |
| F3 | Name a reviewer for every role in the working agreement | Scrum Master | Sprint 3 D1 |
| F4 | Run the built-screen usability review and fill `review-results.md` | UI/UX Designer | Sprint 3 D3 |
