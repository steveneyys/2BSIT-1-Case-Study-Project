# Sprint 1 – Impediment Log

**Task:** S1-SM-04 · Keep adding rows during the sprint. An impediment is anything that slows or stops someone;
the Scrum Master's job is to get it removed. Dates are `YYYY-MM-DD`. Owner is a role.

| ID | Raised | Raised by | Impediment | Impact | Owner | Status | Resolution / next step | Resolved |
|---|---|---|---|---|---|---|---|---|
| IMP-01 | 2026-10-24 | Developer | App could not connect to Supabase ("connection timeout"). | Blocked DEV-01 verification | Developer | Resolved | Use the **Session pooler** connection string, not the direct one (direct needs IPv6). | 2026-10-24 |
| IMP-02 | 2026-10-24 | Developer | "Password authentication failed" after the connection worked. | Blocked DEV-01 verification | Developer | Resolved | The placeholder brackets `[ ]` were left around the password in `DATABASE_URL`. Removed them. | 2026-10-24 |
| IMP-03 | 2026-10-24 | Developer | A real Supabase secret key was pasted into `.env.example`; GitHub push protection blocked the push. | Push blocked; credential at risk | Developer | **Open** | Commit rewritten so the key never reached GitHub. **Still to confirm:** key and database password rotated in Supabase. | |
| IMP-04 | 2026-10-24 | Developer | A new Git branch was created for every task and each push made another remote branch. | Messy repository, hard to review | Scrum Master | Resolved | Rule: one branch per role (action A1). Delete leftover task branches on GitHub. | 2026-11-01 |
| IMP-05 | 2026-11-01 | Developer | `npm test` failed on newer Node versions (`node --test test/` treated the folder as a file). | Tests could not run | Developer | Resolved | Script changed to `node --test`. | 2026-11-01 |
| IMP-06 | 2026-11-01 | Developer | `git push` rejected (non-fast-forward) and merge conflicts after teammates merged DEV-03 and DBA-03 into `main`. | Delayed DEV-05 PR | Developer | Resolved | Aborted the stuck merge, pulled the role branch, resolved README and `userRepo.js`, then pushed. | 2026-11-01 |
| IMP-07 | 2026-11-01 | Developer | Code used assumed column names; the real tables (`role_code`, `approval_status`, token `purpose`/`used_at`) were different. | DEV-02 to DEV-06 SQL would fail on the real database | Developer | Resolved | SQL updated; tests added that check the column names. Prevent repeats with action A2. | 2026-11-02 |
| IMP-08 | 2026-11-02 | Developer | Two tests failed after copying updated files; one exposed a real bug (reset tokens saved without `purpose`). | Risk of shipping a broken reset flow | Developer | Resolved | Files corrected; `npm test` passes. Prevent repeats with action A3. | 2026-11-02 |
| IMP-09 | 2026-11-02 | Developer | `npm run dev` failed: port 3000 already in use by an earlier run. | Minor delay | Developer | Resolved | Stopped the old process (or set `PORT` in `.env`). | 2026-11-02 |
| IMP-10 | 2026-11-02 | Developer | Forgot-password sends no email. | Cannot demo reset by email | Scrum Master | **Open** | Without SMTP settings the link prints in the server console. Decide: configure an SMTP account for the team or use console links for the demo (open decision 3). | |
| IMP-11 | 2026-11-02 | Developer | Module View controls from the design are not in the rights catalogue, so module access and read-only access are undecided. | Affects Sprint 2 design | Scrum Master | **Open** | Team decision needed before Sprint 2 planning (open decision 1). | |
| IMP-12 | 2026-11-02 | Developer | Built screens did not match the approved hi-fi design and handoff (password on Register, editable email on Edit User, module View controls, Disapproved status). | Rework after the design arrived | Developer | Resolved (partly) | Register has no password and a set-password link follows approval; email is read-only on edit; UI replaced with the approved look. Module View controls and Disapproved stay open (open decisions 1 and 5). Prevent repeats with action A8. | 2026-11-02 |
| IMP-13 | 2026-11-02 | Tester | `npm test` also ran the Tester's live smoke test, which failed when the server was not running. | False failing test | Developer | Resolved | `npm test` runs only `test/*.test.js`; the smoke test runs separately with the server up. | 2026-11-02 |
| IMP-14 | 2026-11-02 | Developer | Google button did not show. | Delayed Google sign-in | Developer | Resolved | Server restart after adding `GOOGLE_CLIENT_ID`, and `http://localhost:3000` added as an authorised origin. | 2026-11-02 |

## Summary at last update

- Total logged: 14 · Resolved: 11 · Open: 3 (IMP-03, IMP-10, IMP-11)
- Last updated: 2026-11-02
