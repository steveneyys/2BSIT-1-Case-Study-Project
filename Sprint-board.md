# Sprint 1 Board and Module Map (S1-SM-02)

## 1. Module-to-sprint map (8-week limit)

| Sprint | Weeks | Guide module(s) | Main deliverables | Fits 8 weeks? |
|---|---|---|---|---|
| 1 | 1-2 | User Management and access | Register, login, reset password, User Management, Rights dialog, main page, permission check | Yes |
| 2 | 3-4 | Customers and Products | CRUD, soft delete/restore, price history, current price | Yes |
| 3 | 5-6 | Human Resources | Departments, Jobs, Employees, Job History, salary visibility | Yes |
| 4 | 7-8 | Sales and Reports | Sales header/details, payments, balances, 7 reports, audit-log viewer | Yes (heaviest sprint) |

Sprint 2 and 4 carries two modules.

## 2. Sprint 1 Stories with acceptance criteria

| ID | Story | Acceptance criteria |
|---|---|---|
| S1-DEV-01 | As a team, we want a working app skeleton so everyone can build on it. | 1. A fresh clone runs by following the README. 2. DB settings come from `.env`, and `.env.example` is committed with no secrets. 3. `/health` confirms the DB connection. |
| S1-DEV-02 | As a visitor, I want to register so I can request access. | 1. Required fields and a unique email are validated. 2. The password is stored hashed, never in plain text. 3. The new account has role `User` and status pending. |
| S1-DEV-03 | As a user, I want to log in and out securely. | 1. Valid credentials create a session, and logout destroys it. 2. A wrong password is refused, with no hint about which field was wrong. 3. A blocked user cannot sign in. 4. First login goes through a one-time set-password link. |
| S1-DEV-04 | As a user, I want to reset a forgotten password. | 1. An emailed token is stored only as a hash. 2. An expired or already-used token is refused. 3. A successful reset marks the token used. |
| S1-DEV-05 | As an Admin, I want to manage users. | 1. The list has Add, Edit and Block/Unblock. 2. Admins see Users only: Superadmins are hidden, and other Admins show "-" in Actions. 3. Block/Unblock changes the status badge and the button. |
| S1-DEV-06 | As a Superadmin, I want to approve users and designate admins. | 1. Pending users can be approved. 2. A user can be promoted to Admin. 3. The last Superadmin cannot be removed or blocked. |
| S1-DEV-07 | As an Admin, I want to assign rights per user. | 1. The dialog groups the 36 rights by module, with a module checkbox and All/None. 2. Ticking adds a row and unticking removes it. 3. Every change is recorded in `audit_log`. |
| S1-DEV-08 | As a user, I want a menu showing only what I may use. | 1. The sidebar and tiles follow role and rights. 2. Server middleware refuses a forbidden action even when the URL is typed by hand. 3. Unauthenticated requests go to login. |
| S1-DBA-01 | Team DB setup, runner script, README (no Docker). | A new teammate can set up the DB from the README alone, and the runner applies migrations in order. |
| S1-DBA-02 | HOPE base tables and sample data. | The tables and rows from `HopeDB_audit.sql` load with no errors. |
| S1-DBA-03 | User and rights tables. | `app_user` has role and a blocked flag, and `user_permission` supports soft delete. |
| S1-DBA-04 | Reset-token table. | Tokens are hashed, have an expiry, and have a used flag. |
| S1-DBA-05 | Seed data. | One Superadmin per member, five modules, 36 rights, default roles, and no passwords committed. |
| S1-DBA-06 | `audit_user()` records the logged-in user. | `audit_log.action_by` shows the app user, and a test proves it. |
| S1-TST-01 | Test plan and acceptance criteria. | The plan covers every Sprint 1 story, and each has pass/fail criteria. |
| S1-TST-02 | Auth test cases. | They cover register, login/logout, set/reset password, and expired and reused tokens. |
| S1-TST-03 | User Management test cases. | They cover add, edit, block, approve and designate, plus Superadmin hiding and the last-Superadmin guard. |
| S1-TST-04 | Permission matrix. | Superadmin/Admin/User x each right passes in the menu, buttons and server. |
| S1-TST-05 | Smoke test. | An automated login-to-main-page test runs and passes. |
| S1-TST-06 | Bug reports and verification. | Each bug has steps to reproduce, and each fix is re-tested. |
| S1-UIX-01 | Design system. | Colors, typography and core components are documented. |
| S1-UIX-02 | Auth wireframes. | They cover login, register, set password and reset password. |
| S1-UIX-03 | Main page, User Management and Rights wireframes. | Each screen is wireframed for Superadmin, Admin and User where it differs. |
| S1-UIX-04 | Hi-fi mockups and handoff notes. | The five screens are mocked up, and spacing and states are documented. |
| S1-UIX-05 | Usability review. | The built screens are reviewed and a prioritised fix list is produced. |
| S1-SM-01 | Repo setup. | `main` is protected (PR required, 1 approval), and PR and issue templates exist. |
| S1-SM-02 | Board and module map. | All 29 stories are on the board with criteria and owners, and the module map is committed. |
| S1-SM-03 | Team rules. | The working agreement, Definition of Done and role guide are merged. |
| S1-SM-04 | Mid-sprint check. | Day-5 notes exist, and each impediment has an owner and a date. |
| S1-SM-05 | Review and retro. | The report is merged, with demo results and Sprint 2 actions. |
