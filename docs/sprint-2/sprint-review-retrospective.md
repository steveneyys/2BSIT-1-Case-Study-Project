# Sprint 2 – Review and Retrospective

**Task:** S2-SM-05 · **Sprint:** 2 (Weeks 3–4) · **Facilitator:** Scrum Master

## Part A – Sprint Review

### 1. Sprint goal and result

**Goal:** People who hold the right can find, add, change, delete and restore customers and products and manage a product's price history with effective dates; every action follows the person's rights on the server, and a product's current price is the latest price in force today.

**Result:** Met. All 30 planned PRs are merged or ready to merge (see `velocity-and-burndown.md`). The Tester's results show 0 open bugs, and the Developer's automated tests pass (165). Two follow-ups remain open: the built-screen usability review and a rerun of some tests on the final build (section 4).

### 2. What was delivered

| Area | Delivered |
|---|---|
| Customers | List with search by code or name, payment-term filter and paging; Add and Edit (code generated, name 20, address 50, pay term COD/30D/45D); delete with confirmation, blocked while the customer has active sales; Admin tabs Active/Inactive/All with Status and Stamp; Admin-only restore |
| Products | List with search by code or description, unit filter, sorting and paging, with the current price; Add and Edit (code two letters plus four digits, description 30, unit pc/ea/mtr/pkg/ltr); delete blocked while active prices or sale lines exist; Admin tabs and restore |
| Price history | Prices dialog per product: add, edit and delete a price with an effective date; one price per date; Current / Scheduled / Past labels; current and next price shown on the product page |
| Rights | Add, Edit and Delete for customer, product and price each follow their own right, on the screen and on the server; Restore is Admin only; a rights matrix test locks this in for all 11 change routes |
| Database | Migrations 007 to 011: search and sort indexes, price-as-of-date query, validation constraints, delete and restore checks for parent and child records, demo data; a search performance check |
| Design | Wireframes for customers, products and price history; hi-fi mockups with handoff notes; empty, error and confirm-delete states |
| Testing | 30 customer cases, 32 product and price cases, 21 soft-delete and restore cases, 36 per-right results (9 rights x 4 roles) plus role checks, regression of 118 checks (111 from Sprint 1, 7 new), bug log with 0 bugs |

### 3. Demo checklist (run live)

- [ ] Admin: open Customers, search by name, filter by payment term, page through the list
- [ ] Add a customer (code is generated); try a blank name and see the message beside the field
- [ ] Delete a customer without sales; show it under Inactive; restore it
- [ ] Try to delete a customer who has sales; show the blocked message
- [ ] Products: search, filter by unit, sort by current price
- [ ] Add a product; try a duplicate code and a code that belongs to a deleted product
- [ ] Open Prices: add a price with today's date, add a future date (Scheduled), edit a price, delete a price
- [ ] Show the current price change on the product list after the price change
- [ ] Sign in as a User with only Add Product: Add works; Edit, Delete, Prices actions are hidden and refused by the server
- [ ] Sign in as a User with no Customer right: the module is not in the menu and the page redirects home

### 4. Not done or carried over

| Item | Why | Carry to |
|---|---|---|
| Built-screen usability review (S2-UIX-05) | Documents are prepared but results are marked "Pending" (IMP-16) | Sprint 3 D3 |
| Rerun of soft-delete, per-right and regression tests on the final build | Test files are dated before the later features merged (IMP-17) | Sprint 3 D1 |
| Module-only access cases TC-PR-01 to 03 | Expectation may not match the build (IMP-18) | Sprint 3 D1 |
| Module View controls (5) | Still undecided (IMP-10) | Sprint 3 planning |
| Disapproved status and action | Not built; needs a migration | Sprint 3 planning |
| Real email delivery | Console links still used (IMP-09) | Sprint 3 planning |
| Restore rules sign-off | Built rule needs team confirmation (IMP-20) | Sprint 3 planning |
| Deleted prices cannot be viewed or restored on screen | Not in the task plan | Sprint 3 backlog (optional) |

### 5. Stakeholder feedback

____________________________________________________________

### 6. Impediment log result

Sprint 2 logged 7 (IMP-14 to IMP-20): 2 mitigated or resolved, 5 open. Two more are open from Sprint 1 (IMP-09, IMP-10). Total open going into Sprint 3: 7.

## Part B – Retrospective

### 7. What went well

- The Designer's handoffs were ready before any build started, and the Developer built the screens to them.
- Each Developer task shipped with automated tests, and the rights matrix test checks every change route in both modules; `npm test` has 165 passing tests, up from 93.
- Permissions live on the server: the Tester's per-right results (36 of 36) and the matrix test agree.
- The database catches mistakes the screens miss (validation constraints, delete blocked by active children, nothing added under a deleted parent).
- The Developer found and fixed screen problems in browser checks before merging (a hidden button that still showed, a success message cleared too soon, an Admin tab that hid some rows).
- Tester regression found no breakage in Sprint 1 (118 of 118) and no Sprint 2 bugs.
- Velocity held at 30 PRs for the second sprint, and the sprint ended before the last planned day.

### 8. What did not go well (and why)

| Problem | Root cause |
|---|---|
| Work arrived late: 3 of 30 PRs merged by D6, 22 by D8 (IMP-14) | No checkpoint before D5; roles waited on each other instead of raising it |
| Developer tasks waited on database migrations (IMP-15) | Migrations merged D7 and D8 against due days D2 to D9; no rule that a migration merges before the story starts |
| Usability review not performed (IMP-16) | It depends on the last screens, which merged on D8 and D9 |
| Test results dated before the features merged (IMP-17) | Tests written from the design and a local build rather than the merged `main` |
| A test expects module-only access (IMP-18) | The "View" question from Sprint 1 was never decided, so Tester and Developer assumed different things |
| Hard to match PRs to tasks (IMP-19) | Two tasks in one PR, a repeated PR title, commits named only with the task ID |
| Restore rules chosen by the Developer alone (IMP-20) | The design left the policy open and nobody owned the decision |
| Sprint 1 actions only partly done (R2, R4, R5, R6, R7, R8) | Actions had no due date inside the sprint and no weekly follow-up |

### 9. Actions for Sprint 3

| # | Action | Owner | Due |
|---|---|---|---|
| S3-1 | Checkpoints: every role has a PR or a stated blocker by D3; 40% of due PRs merged by D5 | Scrum Master | Sprint 3 D3 and D5 |
| S3-2 | A migration merges before the Developer task that needs it starts | DB Admin, Developer | Sprint 3 D1 |
| S3-3 | Tester records the build or commit tested and the date; rerun S2-TST-03, -04, -05 on the final `main` | Tester | Sprint 3 D1 |
| S3-4 | Tester and Developer settle TC-PR-01 to 03 and the module access rule | Tester, Developer | Sprint 3 D1 |
| S3-5 | Run the built-screen usability review and fill `review-results.md` and `fix-list.md` | UI/UX Designer | Sprint 3 D3 |
| S3-6 | Decision meeting: module View controls, Disapproved status, email delivery, handoff choices, restore rules | Scrum Master, all | Sprint 3 D1 |
| S3-7 | One PR per task, title `TASK-ID: short description`; list the migrations a PR depends on | Developer, DB Admin | ongoing |
| S3-8 | Confirm the exposed keys were rotated and say so in the PR notes | Developer | before Sprint 3 starts |
| S3-9 | Write the reviewer for each role in the working agreement | Scrum Master | Sprint 3 D1 |

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
