# Sprint 2 Planning Notes and Board (S2-SM-01)

**Sprint:** 2 · **Weeks:** 3–4 · **Working days:** D1 Tue 2026-11-03 to D10 Mon 2026-11-16 (Monday to Friday) · **Facilitator:** Scrum Master
**Module:** Customers and Products (from the module map in `Sprint-board.md`)

> Dates assume ten Monday-to-Friday working days starting the day after Sprint 1 closed (2026-11-02). Change them if your instructor's calendar differs.

## 1. Sprint goal

People who hold the right can find, add, change, delete and restore customers and products, and manage a product's price history with effective dates. Every action follows the person's rights on the server, deleted records stay out of sight for Users, and a product's current price is always the latest price in force today.

## 2. Capacity and commitment

| Role | Planned PRs | Notes |
|---|---|---|
| Developer | 8 | S2-DEV-01 to S2-DEV-08 |
| DB Admin | 6 | S2-DBA-01 to S2-DBA-06 |
| Tester | 6 | S2-TST-01 to S2-TST-06 |
| UI/UX Designer | 5 | S2-UIX-01 to S2-UIX-05 |
| Scrum Master | 5 | S2-SM-01 to S2-SM-05 |
| **Team total** | **30** | Same as Sprint 1 (velocity 30), so the commitment is realistic. |

One task is one PR. Branches: one per role (Developer, DB-Admin, Tester, UI/UX-design, Scrum-Master). Nobody pushes to `main`.

## 3. Carry-over from Sprint 1 (decide at planning)

| # | Item | Proposed handling in Sprint 2 | Decision owner |
|---|---|---|---|
| C1 | Module View controls (5): where stored, do they gate module access? | Interim rule used by the build: holding any right in a module opens the module. Team to confirm or change. | DB Admin, Developer, UI/UX |
| C2 | Disapproved status and action | Not in the Sprint 2 scope; needs a migration. Decide: add in Sprint 3 or drop. | Team |
| C3 | Real email delivery (SMTP) | Console links stay for the demo unless a team SMTP account is set up. | Team |
| C4 | Key rotation (exposed Supabase key and database password) | Developer confirms before any new work is pushed. | Developer |
| C5 | Usability review on the final build | Moved to S2-UIX-05 (built screens). | UI/UX |
| C6 | Open handoff decisions (approval policy, token expiry, password policy, Remember me length) | Settle once, record in the planning notes. | Team |

## 4. Dependencies and order of work

| Needed first | Needed by | Why |
|---|---|---|
| S2-DBA-01 active views and indexes (D2) | S2-DEV-01, S2-DEV-04 | The lists search and sort through these. |
| S2-DBA-02 price-as-of-date query (D4) | S2-DEV-04, S2-DEV-08 | Current price is the latest price on or before today. |
| S2-DBA-03 validation constraints (D5) | S2-DEV-02, S2-DEV-05 | Forms must match the database rules. |
| S2-DBA-04 child-record delete checks (D6) | S2-DEV-03, S2-DEV-06 | Delete must be blocked while active child records exist. |
| S2-UIX-01 to S2-UIX-03 wireframes and handoff (D2–D5) | S2-DEV-01 to S2-DEV-08 | Build to the approved design. |
| S2-DEV-01 to S2-DEV-08 | S2-TST-01 to S2-TST-06, S2-UIX-05 | Tests and the usability review need the built screens. |

## 5. Sprint 2 stories with acceptance criteria and owners

Owner is a role. Planned day is the working day the task is due (from the task plan).

| ID | Story | Acceptance criteria | Planned day |
|---|---|---|---|
| S2-DEV-01 | Customer list with search and filter (permission-checked) | Only people with a Customer right see the screen; search by code or name; filter by payment term; paging; empty state. | D2 |
| S2-DEV-02 | Customer create and edit form | Name required (20), address optional (50), pay term COD/30D/45D; code is generated; errors shown beside the field. | D3 |
| S2-DEV-03 | Customer soft delete and restore | Delete asks for confirmation; blocked while the customer has active sales; Admin sees Inactive rows and can restore. | D4 |
| S2-DEV-04 | Product list with search and filter | Search by code or description; filter by unit; current price shown; empty state. | D5 |
| S2-DEV-05 | Product create and edit form | Code, description (30) and unit (pc, ea, mtr, pkg, ltr) required; code unique and not editable. | D6 |
| S2-DEV-06 | Product soft delete and restore | Blocked while active prices or sale lines exist; Admin restores. | D7 |
| S2-DEV-07 | Price history: add, edit and delete price with effective date | Price above zero; one price per date; delete is a soft delete; each action needs its own right. | D8 |
| S2-DEV-08 | Current-price display; per-action rights checks across both modules | Current price and next scheduled price shown; every Add/Edit/Delete refused on the server without the right. | D9 |
| S2-DBA-01 | Customer and product active views, indexes | Search and sort use indexes; views hide deleted rows. | D2 |
| S2-DBA-02 | Query: current price as of a given date | Latest active price on or before the date; none gives no price. | D4 |
| S2-DBA-03 | Validation constraints (payTerms, unit) | Bad pay term, unit, blank name or description is refused by the database. | D5 |
| S2-DBA-04 | Verify child-record delete checks | Parent with active children cannot be deleted; children cannot be added under a deleted parent. | D6 |
| S2-DBA-05 | Demo data for customer, product, price history | Enough rows to demo search, paging, current price and a deleted row. | D7 |
| S2-DBA-06 | Search performance check and index tuning | Plans checked; indexes reviewed; findings written down. | D9 |
| S2-TST-01 | Test cases: customer module | Each story has a case with expected result; results recorded. | D3 |
| S2-TST-02 | Test cases: product and price history | Same for products and prices. | D5 |
| S2-TST-03 | Soft delete and restore tests | Includes delete blocked by active children. | D7 |
| S2-TST-04 | Per-right permission tests | Add/Edit/Delete for customer, product and price checked as menu, button and server. | D8 |
| S2-TST-05 | Regression test of Sprint 1 | Sprint 1 cases rerun; no new failures. | D9 |
| S2-TST-06 | Bug reports and fix verification | Every bug has severity and status; no open Critical or High at the end. | D9 |
| S2-UIX-01 | Wireframes: customer screens | List, add/edit, delete and restore states. | D2 |
| S2-UIX-02 | Wireframes: product and price history screens | List, form, price history. | D3 |
| S2-UIX-03 | Hi-fi mockups and handoff notes | Developer can build without asking. | D5 |
| S2-UIX-04 | Empty, error and confirm-delete states | Each state designed and handed off. | D7 |
| S2-UIX-05 | Usability review of built screens | Review run on the built screens; fix list written. | D9 |
| S2-SM-01 | Sprint 2 planning notes and board | This document. | D1 |
| S2-SM-02 | Follow up Sprint 1 retro actions | Each action has a status, evidence and owner. | D3 |
| S2-SM-03 | Mid-sprint check and impediment log | Progress by role; impediments with owners. | D5 |
| S2-SM-04 | Update velocity and burndown | Velocity table and burndown chart from real merge dates. | D8 |
| S2-SM-05 | Sprint 2 review and retrospective report | Goal result, demo, actions for Sprint 3. | D10 |

## 6. Risks identified at planning

| Risk | Plan |
|---|---|
| Developer tasks wait on database migrations. | DB Admin merges S2-DBA-01 to S2-DBA-03 by D5; Developer starts from the migration files as soon as they are shared. |
| Work piles up at the end of the sprint. | Each role posts progress by D5; the Scrum Master checks the board on D5 (see the mid-sprint check). |
| Design and build drift apart (Sprint 1, IMP-11). | Developer reads the handoff first and shows the finished screen to the Designer before the PR. |
| Test evidence written before the feature is merged. | Tester runs cases on the merged build and records the date and build. |

## 7. Definition of Done

Unchanged from `team-rules-and-role-guide.md` (criteria 1–9), including "permission checks are enforced on the server" and "no secrets in the repo".

## 8. Meeting record

| Item | Value |
|---|---|
| Planning meeting date | ____ |
| Attendees | ____ |
| Decisions on C1–C6 | ____ |
