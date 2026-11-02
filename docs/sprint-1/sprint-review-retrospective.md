# Sprint 1 – Review and Retrospective

**Task:** S1-SM-05 · **Sprint:** 1 (Weeks 1–2) · **Facilitator:** Scrum Master

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

### 3. Not done or carried over

| Item | Why | Carry to |
|---|---|---|
| Module View controls (5) | Storage in the database and effect on module access undecided | Sprint 2 planning |
| Disapproved status and action | Not in the database CHECK; needs a migration and endpoint | Sprint 2 planning |
| Real email delivery | Needs SMTP settings; console links used in dev | Sprint 2 planning |
| Usability review rerun on the final build | Review was done on the design, not the final screens | Sprint 2 |
| Open handoff decisions: approval policy, token expiry, password policy, Remember me length | Awaiting team confirmation | Sprint 2 planning |

### 4. Impediment log result

13 logged, 11 resolved, 2 open (IMP-09 email delivery, IMP-10 module View controls).
