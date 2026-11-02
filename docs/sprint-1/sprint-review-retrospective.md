# Sprint 1 – Review and Retrospective

**Task:** S1-SM-05 · **Sprint:** 1 (Weeks 1–2) · **Facilitator:** Scrum Master
**Date held:** ____-__-__ · **Attendees:** ______________________

> Fill the blanks marked `____` during the meeting. Facts below come from the sprint task plan, the impediment log and the test runs.

## Part A – Sprint review

### 1. Sprint goal and result

**Goal:** People can register, be approved, sign in and out, reset a forgotten password, and be managed by admins; the main page and every API show only what a person's role and rights allow.

**Result:** Met. 28 of 30 planned PRs are merged; the other 2 are the Scrum Master documents (SM-04, SM-05).

### 2. What was delivered

| Area | Delivered |
|---|---|
| Registration and approval | Register (first name, last name, email); account starts Pending; a Superadmin approves; the person then sets a password through a one-time emailed link |
| Sign in / out | Email and password with throttling, Remember me, status banners (Pending, Blocked), Google sign-in and sign-up that never skips approval |
| Password recovery | Forgot password (never reveals if an account exists), expiring single-use links, clear expired/used/invalid screens |
| User Management | Search, status filters, add, edit (email read-only), approve, block/unblock, last-Superadmin protection, Admins cannot see Superadmins |
| Assign Rights | Per-user rights dialog saved with an audit trail |
| Main page | Menu and quick actions filtered on the server by role and rights |
| Database | Migrations, rights seed, password tokens, audit user |
| Design | Design system, wireframes, hi-fi mockups, handoff notes, usability review |
| Testing | Test cases, permission matrix, smoke test; 93 automated unit tests pass |

### 3. Demo checklist (run live)

- [ ] Register a new person; show the Pending message
- [ ] Try to sign in while Pending (banner); Google sign-up creates a Pending account only
- [ ] Superadmin approves; the set-password link arrives (or prints in the server console)
- [ ] Set a password; sign in; Home shows only what the rights allow
- [ ] Assign rights to a User and show the menu change
- [ ] Admin cannot see Superadmins; the last active Superadmin cannot be blocked or demoted
- [ ] Forgot password; open the link twice (second shows "already used")

### 4. Not done or carried over

| Item | Why | Carry to |
|---|---|---|
| Module View controls (5) | Storage in the database and effect on module access undecided | Sprint 2 planning |
| Disapproved status and action | Not in the database CHECK; needs a migration and endpoint | Sprint 2 planning |
| Real email delivery | Needs SMTP settings; console links used in dev | Sprint 2 planning |
| Key rotation confirmation (IMP-03) | Not yet confirmed | Immediately |
| Usability review rerun on the final build | Review was done on the design, not the final screens | Sprint 2 |
| Open handoff decisions: approval policy, token expiry, password policy, Remember me length | Awaiting team confirmation | Sprint 2 planning |

### 5. Stakeholder feedback

____________________________________________________________

## Part B – Retrospective

### 6. What went well

- Early database migrations let the Developer build against real tables.
- Every Developer task has automated tests; the shared check is `npm test`.
- Authorization lives on the server (API and page guard), not only in the screens.
- Secret scanning caught a credential before it reached GitHub.
- The team converged on the approved design by the end of the sprint.

### 7. What did not go well (and why)

| Problem | Root cause |
|---|---|
| Code and schema drifted apart (IMP-07) | SQL written against assumed column names; no shared "depends on" list |
| Branch confusion and rejected pushes (IMP-04, IMP-06) | Branch rule not agreed at the start |
| Stale files after copying updates (IMP-08) | Copying files by hand instead of pulling; tests not re-run |
| Screens differed from the design (IMP-12) | Designer handoff not read before building |
| A test run failed because of another role's script (IMP-13) | Test commands picked up files outside the unit tests |

### 8. Impediment log result

14 logged, 11 resolved, 3 open (IMP-03 key rotation, IMP-10 email delivery, IMP-11 module View controls).

### 9. Actions for Sprint 2

| # | Action | Owner | Due |
|---|---|---|---|
| R1 | One branch per role; pull `main` into it before starting a task (A1) | All | Sprint 2 day 1 |
| R2 | Every database-touching PR has a "Depends on" section linking the migration (A2) | Developer, DB Admin | Sprint 2 day 1 |
| R3 | Run `npm test` before every push and after every merge (A3) | All | ongoing |
| R4 | Read the Designer's handoff and show the finished screen to the Designer before the PR (A8) | Developer, UI/UX | ongoing |
| R5 | Decide the open items in section 4 and write the outcome in the Sprint 2 planning notes | Scrum Master | Sprint 2 planning |
| R6 | Confirm keys were rotated and add "no real secrets in the repo" to the Definition of Done (A4) | Developer, Scrum Master | now |
| R7 | Agree who reviews each PR before merge (A5) | All | Sprint 2 day 1 |
| R8 | Repeat the usability review on the final build | UI/UX | Sprint 2 week 1 |

### 10. One thing each person will do differently

| Role | Commitment |
|---|---|
| Developer | ____ |
| DB Admin | ____ |
| Tester | ____ |
| UI/UX Designer | ____ |
| Scrum Master | ____ |

### 11. Team mood (1 to 5)

Average: ____ · Comments: ____________________________________
