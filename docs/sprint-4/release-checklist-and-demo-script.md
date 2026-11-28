# Release Checklist and Demo Script (S4-SM-03)

**Sprint:** 4 · **Facilitator:** Scrum Master · **Product:** Hope, Inc. ERP (Node.js 20 + Express + PostgreSQL on Supabase)

> **Draft written Sat 2026-11-28** from the repository (`main` at e8a4c2c, PR #127). Every box is **unticked on purpose**: a box is ticked only by the person named, on the final `main`, with the commit and date in the last column. Where the repository already shows the answer, the "Evidence now" column says so; that is not a tick. Account names, passwords and dates are left as `____`; nothing was invented.

Release candidate commit: `____` · Date: `____` · Checked by: `____`

## Part 1 – Release checklist

Status values: **Done**, **Accepted** (known gap the team agrees to ship with, written in section 7), **Open**.

### 1. Build and run

| # | Check | Owner | Evidence now | Status | Commit / date |
|---|---|---|---|---|---|
| 1.1 | Fresh clone: `npm install`, `cp .env.example .env`, `npm run dev` starts and `/api/health/db` returns `{"status":"ok","database":"connected"}` | Developer | README "Run locally" | ☐ | |
| 1.2 | `npm test` passes on `main` with no failures | Developer, Tester | Suite was 408 tests when DEV-08 was packaged (260 at the end of Sprint 3); not yet run on `main` by the Tester | ☐ | |
| 1.3 | No secrets in the repository (`.env` ignored; keys only in `.env`) | Developer | `.gitignore` present | ☐ | |
| 1.4 | `SESSION_SECRET` set and not the sample value | Developer | | ☐ | |
| 1.5 | Exposed Supabase key and database password rotated (C4) | Developer | No written confirmation in the repository | ☐ | |

### 2. Database

| # | Check | Owner | Evidence now | Status | Commit / date |
|---|---|---|---|---|---|
| 2.1 | `npm run migrate` applies 001 to 017 on an empty database without error | DB Admin | Migrations 001 to 017 on `main` | ☐ | |
| 2.2 | Sprint 4 migrations (S4-DBA-01 to 06) merged and applied | DB Admin | **None on `main`** | ☐ | |
| 2.3 | Superadmins seeded (`npm run seed:superadmins`) and can sign in | DB Admin | Script present | ☐ | |
| 2.4 | Demo data present for customers, products, prices, HR and **sales, lines, payments** | DB Admin | 011 and 016 exist; **no sales demo data** | ☐ | |
| 2.5 | `npm run db:backup` then `npm run db:restore` works from a clean database | DB Admin | S3-DBA-06 (#117) | ☐ | |
| 2.6 | Sprint 4 screens run against the real database without SQL errors (IMP-26) | Developer | Only stub-tested so far | ☐ | |

### 3. Security and rights (server-side)

| # | Check | Owner | Evidence now | Status | Commit / date |
|---|---|---|---|---|---|
| 3.1 | Every change route has its own right, and Restore is Admin only (rights matrix test) | Tester | `test/rights-matrix.test.js` covers customers, products, HR, sales, details, reports, balances | ☐ | |
| 3.2 | A User with no right for a module gets no menu item and is redirected from its pages | Tester | Page guard per page | ☐ | |
| 3.3 | Salary and job history only with View Job History: employee list, profile, job history screen **and the Employee Job History report** | Tester | Rule enforced in the service | ☐ | |
| 3.4 | Audit viewer: Superadmin only; Admin and User are redirected with the "restricted" message and the API returns 403 | Tester | `test/audit.test.js` | ☐ | |
| 3.5 | Audit replies never contain a password, hash or token | Tester | Redaction in `src/services/audit.js` | ☐ | |
| 3.6 | Write replies do not echo salary; scrubbed replies carry only keys | Tester | Sprint 3 and 4 tests | ☐ | |

### 4. Decisions (each is Done or Accepted)

| Item | Question | Interim answer in the build | Status |
|---|---|---|---|
| C1 | Module View controls | Any right in a module opens it | ☐ |
| C2 | Disapproved status | Not built; dropped | ☐ |
| C3 | Email delivery | Console links for the demo | ☐ |
| C4 | Key rotation | Developer confirms | ☐ |
| C8 | Restore rules | Admin only; delete blocked by active children; nothing added under a deleted parent | ☐ |
| C9 | View deleted prices | Not built | ☐ |
| D1 | Payment right | Sales-list rights to view; `SALE_EDIT` to record | ☐ |
| D2 | Overpayment | Refused | ☐ |
| D3 | Quantity | Whole number from 1 | ☐ |
| D4 | Receipt number | `OR` + 6 digits suggested, unique | ☐ |
| D5, D6 | `TR000125` numbers and peso (design shows `T-001` and `$`) | Build as stated | ☐ |
| D7 to D9 | Seven reports, "active employee", Top N up to 100 | As in the planning notes | ☐ |
| D10 | Sale with active payments cannot be deleted from the screens | Accepted limitation | ☐ |
| D11 | Audit viewer shows what `audit_log` holds; salary not hidden from the Superadmin | As built | ☐ |

### 5. Features by sprint (tick when shown working on the release candidate)

| Sprint | Feature | Where | Status |
|---|---|---|---|
| 1 | Register, approval, set password, sign in and out, Remember me, Google sign-in, forgot password | Login pages | ☐ |
| 1 | User Management: search, filter, add, edit, approve, block, last-Superadmin protection | `/users.html` | ☐ |
| 1 | Assign Rights with audit trail; menu and quick actions filtered by role and rights | Main page | ☐ |
| 2 | Customers: list, search, filter, add, edit, delete, restore | Customers | ☐ |
| 2 | Products and price history: current, scheduled, past prices | Products | ☐ |
| 3 | Departments, jobs, employees, job history, profile timeline, separation date | Human Resources | ☐ |
| 4 | Sales list, add and edit a sale, price-date confirmation | Sales | ☐ |
| 4 | Sale details (lines priced on the sale date, totals) | Sale page | ☐ |
| 4 | Payments, balance per sale and per customer | Payments, Balance | ☐ |
| 4 | Delete and restore a sale | Sales | ☐ |
| 4 | Seven reports with Print and Save as PDF | Reports | ☐ |
| 4 | Audit viewer (Superadmin) | Dashboard card, `/audit.html` | ☐ |

### 6. Testing and documents

| # | Check | Owner | Status |
|---|---|---|---|
| 6.1 | S4-TST-01 to 06 merged; each file names the commit and date tested | Tester | ☐ |
| 6.2 | End-to-end test (sign in, sale, lines, payment, balance, report) recorded as passed on the release candidate | Tester | ☐ |
| 6.3 | Final sign-off lists the commit it covers; no open Critical or High bug | Tester | ☐ |
| 6.4 | Usability review run on the built screens; fix list handled or accepted (IMP-16) | UI/UX Designer | ☐ |
| 6.5 | Sprint 1 to 4 documents on `main` (`docs/sprint-1` to `docs/sprint-4`, wireframes, Testing) | Scrum Master | ☐ |
| 6.6 | README run instructions match what the team actually did on a clean machine | Developer | ☐ |

### 7. Known gaps to state at the demo (Accepted when the team agrees)

- Forgot-password and verification links print in the server console; no email is sent (C3).
- No Disapproved status (C2).
- A sale with active payments cannot be deleted from the screens; payment delete and restore is not built (D10).
- Deleted prices cannot be viewed on screen (C9).
- Sprint 4 design shows `$` and `T-001`; the build uses ₱ and `TR000125` (D5, D6).
- The audit viewer cannot show "result" or "request reference" because the audit table does not store them.
- Report figures are computed in application queries until the S4-DBA views are merged.

### 8. Go / no-go

| Gate | Required | Result |
|---|---|---|
| Sections 1 to 3 | All Done | ____ |
| Section 4 | Every item Done or Accepted | ____ |
| Section 5 | Every Sprint 4 feature shown working once on the release candidate | ____ |
| Section 6.3 | Signed off, no Critical or High | ____ |
| Decision | **Go / No-go** | ____ (Scrum Master, ____ date) |

## Part 2 – Demo script (about 25 minutes)

**Before the demo.** Load the demo data. Open three browser profiles (or windows) already signed in as: **Superadmin** `____`, **Admin** `____`, and **User** `____` who holds only the Sales view rights (SALEDET_VIEW) plus Sales Add. Create a second User `____` with Edit Employee but not View Job History, and a third `____` with the Employee Job History report right but not View Job History. Have the release candidate commit on screen. Zoom the browser to 125%. Keep the console visible for the password-reset link.

**Who talks.** Scrum Master opens and closes; each role presents its part (suggested: Developer for 3 to 6, DB Admin for the data and backup, Tester for the results, Designer for the design comparison). Change the order if someone is absent.

| # | Min | Role on screen | Do | Expected result | Fallback |
|---|---|---|---|---|---|
| 1 | 2 | Scrum Master | State the goal of the product and the four sprints; show velocity (30, 30, 30, and Sprint 4) | Audience knows what will be shown | Slide of `velocity-and-burndown.md` |
| 2 | 2 | Anyone | Register a new person; show Pending; as Superadmin approve; open the set-password link from the console | Account becomes Active; link works once | Use an existing Pending account |
| 3 | 1 | Anyone | Sign in; show Remember me and a wrong password message | Throttle message after repeated failures | Skip throttle |
| 4 | 2 | Superadmin | User Management: search, block and unblock; try to block the last Superadmin | Blocked with a message | Show the message from the test |
| 5 | 1 | Admin | Assign Rights to the User | Menu changes for that user | — |
| 6 | 3 | Admin | Customers and Products: add, edit, delete, see under Inactive, restore; open Prices: current, scheduled and past | Status and Stamp change; current price moves | Use demo rows |
| 7 | 3 | Admin | Human Resources: add an employee, history rows, profile timeline; try a date the employee already has | Message beside the field; timeline updates | — |
| 8 | 1 | User (no View Job History) | Open the same employee | No History button, no salary | — |
| 9 | 3 | Admin | **Sales:** add a sale (customer, employee, date); open Details; add lines; note the price on each line is the price in force on the sale date; show the total | `TR` number generated; total correct | Use a demo sale |
| 10 | 1 | Admin | Change the sale date to one with a different price | Asks to confirm re-pricing; if a line would have no price the change is refused | — |
| 11 | 2 | Admin | **Payments:** record a payment; open Balance for the sale | Balance falls; status "Balance due" or "Paid in full" | — |
| 12 | 1 | Admin | Try to pay more than the balance | Refused with a message | — |
| 13 | 1 | Admin | Customer balance page | All the customer's sales and what is owed | — |
| 14 | 2 | Admin | Delete a sale that still has lines | Blocked: "active line items and payments exist"; nothing is deleted | — |
| 15 | 1 | Admin | Delete a sale that has none; show under Inactive; restore it | Row shaded, then restored | — |
| 16 | 3 | Admin | **Reports:** open each of the seven (product master, active employees, all employees, employee job history, top customers, top products, top sales); set a date range and Top 5; Print / Save as PDF | Headings and totals print; unpriced lines noted | Show one report only |
| 17 | 1 | User without report rights | Open Reports | Not in the menu; page redirects home | — |
| 18 | 1 | User with the Employee Job History report right but not View Job History | Open the Employee Job History report (an Admin holds every right, so use a User) | Refused | — |
| 19 | 2 | Superadmin | **Audit viewer:** filter by date, actor, module and action; open a row to see the fields changed; show "Hidden" on a sensitive field | Newest first; changes with previous and new values | — |
| 20 | 1 | Admin | Open `/audit.html` | Redirected to the dashboard with "Audit viewer is restricted to Superadmin" | — |
| 21 | 1 | DB Admin | Run `npm run db:backup` and show the file | Backup created | Show the script |
| 22 | 2 | Tester | Read the final sign-off: commit, cases run, open bugs | Numbers match the files | — |
| 23 | 1 | Scrum Master | Known gaps (Part 1 section 7); thanks | — | — |

**Likely questions and the honest answer.**

- *Why is there no email?* Link printed in the server console by decision C3; real SMTP is future work.
- *Where does a person's right come from?* Per user, assigned by an Admin; checked on the server for every route.
- *Can someone delete history?* No. Delete is a flag (soft delete); only an Admin sees and restores deleted rows; the audit table records each change.
- *Why can't I delete a paid sale?* Payments cannot yet be deleted; the sale is protected until they are resolved (D10).
- *Why do totals differ from the wireframe?* The wireframe uses sample amounts in dollars; the build uses the real data in pesos.

**After the demo.** Write the questions asked and who answered in `sprint-review-retrospective.md` section 5.
