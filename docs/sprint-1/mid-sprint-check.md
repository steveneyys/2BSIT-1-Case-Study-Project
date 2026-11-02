# Sprint 1 – Mid-Sprint Check

**Task:** S1-SM-04 · **Sprint:** 1 (Weeks 1–2) · **Facilitator:** Scrum Master

> Updated at the end of the sprint: all roles are complete except the two Scrum Master documents (SM-04, SM-05). 

## 1. Sprint goal

People can register, be approved, sign in and out, reset a forgotten password, and be managed by admins,
and the main page and every API show only what a person's role and rights allow.

## 2. Progress by role

| Role | Planned PRs | Merged | In review | In progress | Not started | Notes |
|---|---|---|---|---|---|---|
| Developer | 8 | 8 | 0 | 0 | 0 | DEV-01 to DEV-08 done, plus the follow-up that matched the build to the approved design and added Google sign-in/sign-up. 93 automated unit tests pass. |
| DB Admin | 6 | 6 | 0 | 0 | 0 | Migrations, password tokens, rights seed and audit user done. |
| Tester | 6 | 6 | 0 | 0 | 0 | Test cases, permission matrix and smoke test (TST-05) delivered. The smoke test needs the server running and is run separately from `npm test`. |
| UI/UX Designer | 5 | 5 | 0 | 0 | 0 | Design system, wireframes, hi-fi and handoff, usability review done. |
| Scrum Master | 5 | 3 | 2 | 0 | 0 | SM-01 to SM-03 merged; SM-04 (this document) and SM-05 (review and retrospective) in review. |
| **Team total** | **30** | **28** | **2** | **0** | **0** | |

**Pace check:** 28 of 30 planned PRs merged; the other 2 are the Scrum Master documents. The sprint is on track to close.

## 3. What is going well

- The database work (migrations 001 to 005) landed early, so the Developer built against the real tables.
- Every Developer task has automated tests, and `npm test` is the shared check before pushing.
- Permission rules are enforced on the server (API and page guard), not only hidden in the screens.
- GitHub's secret scanning stopped a credential from being pushed (see impediment IMP-03).
- The build was brought in line with the approved hi-fi design and handoff notes, and Google sign-in never bypasses approval.

## 4. What is not going well

- **Code and schema drifted apart.** The Developer wrote SQL against assumed column names; the real tables
  (`role_code`, `approval_status`, `purpose`/`used_at`) differed, and it was found only after merging `main`.
- **Branch workflow was unclear.** New branches were created per task, pushes were rejected (non-fast-forward),
  and merge conflicts appeared in files that several people had touched.
- **Stale files after copying updates.** A mix of old and new files made two tests fail and hid a real bug
  (reset tokens saved without a `purpose`).
- **Built screens differed from the approved design** (a password field on Register, editable email on Edit User). Found when the Designer's handoff arrived late; fixed (IMP-12).
- **Setup friction:** Supabase connection settings, port 3000 already in use.

## 5. Blockers and open decisions

| # | Item | Needs | Owner |
|---|---|---|---|
| 1 | The design adds 5 module View controls (41 checkboxes: 36 rights + 5 View). Where are they stored, and do they gate module access? | Team decision (DB Admin + Developer + Designer) before Sprint 2 | Scrum Master |
| 2 | S1-DBA-06: how the app tells the database who is acting. The Developer already sets `app.username` per transaction (`db.txAs`). | DB Admin confirms `audit_user()` uses it and the name length rule (30 characters) | DB Admin |
| 3 | Real email for forgot-password and invitations (needs SMTP settings) or console links for the demo. | Team decision | Scrum Master |
| 5 | Disapproved status is in the design, but the database only allows Active/Pending/Blocked. Add it (and a Disapprove action) or defer? | Team decision | Scrum Master |
| 6 | Open from the handoff: who may approve (Superadmin only is built), token expiry, password policy, Remember me length (7 days by default). | Team confirmation | Scrum Master |
| 4 | Rotate the Supabase secret key and database password that appeared in a chat screenshot and an unpushed commit. | Confirmation it is done | Developer |

## 6. Plan for the rest of the sprint

1. Merge SM-04 and SM-05.
2. Run the review and retrospective (see `sprint-review-retrospective.md`).
3. Settle open decisions 1, 3, 5 and 6 and carry the outcome into Sprint 2 planning.
