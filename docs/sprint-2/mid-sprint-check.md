# Sprint 2 – Mid-Sprint Check

**Task:** S2-SM-03 · **Sprint:** 2 (Weeks 3–4) · **Facilitator:** Scrum Master

> Part 1 is the **check point** (end of D5, Mon 2026-11-09), rebuilt from the merge dates in the repository. Part 2 is the **end-of-sprint update** (Fri 2026-11-13, D9). Both are kept so the pace problem stays visible.

## 1. Sprint goal

People who hold the right can find, add, change, delete and restore customers and products and manage price history; every action follows the person's rights on the server.

## 2. Progress at the check point (end of D5, Mon 2026-11-09)

| Role | Planned PRs | Due by D5 | Merged | In progress | Not started | Notes |
|---|---|---|---|---|---|---|
| Developer | 8 | 4 (DEV-01 to 04) | 0 | 0 | 8 | No Sprint 2 Developer PR had been merged. |
| DB Admin | 6 | 3 (DBA-01 to 03) | 0 | 0 | 6 | First migrations merged on D7. |
| Tester | 6 | 2 (TST-01, 02) | 0 | 0 | 6 | Not started. |
| UI/UX Designer | 5 | 3 (UIX-01 to 03) | 3 | 0 | 2 | Wireframes and handoff done on time. |
| Scrum Master | 5 | 3 (SM-01 to 03) | 0 | 0 | 5 | Planning notes late (this batch). |
| **Team total** | **30** | **15** | **3** | **0** | **27** | **10% merged against 50% planned.** |

**Pace check:** by D5 half of the sprint's PRs were due and only the Designer's 3 were merged. Sprint 2 was **behind plan** at the check point. The goal was still reachable, but only if the Developer, DB Admin and Tester work landed in the second week.

## 3. What was going well at the check point

- Design handoffs for customers, products and price history were ready before any build started.
- The Sprint 1 foundations (sign-in, rights, audit trail) needed no rework for the new modules.
- The Developer already had a tested pattern for lists, forms and per-action rights to reuse.

## 4. What was not going well at the check point

- **Nothing merged from three roles by D5.** Developer, DB Admin and Tester PRs were all still to come.
- **Developer tasks wait on database work.** The views, indexes, price-as-of query and validation rules (S2-DBA-01 to 03) were due D2 to D5 but not yet merged.
- **Testers need built screens.** Test cases could not be run until the Developer's screens existed.
- **Sprint 1 follow-ups were still open** (key rotation, usability rerun, decisions on View controls, Disapproved status and email).

## 5. Update at the end of the sprint (Fri 2026-11-13, D9)

| Role | Planned PRs | Merged | Notes |
|---|---|---|---|
| Developer | 8 | 6 on `main`; 2 (DEV-07, DEV-08) ready to merge | DEV-01 was delivered inside the first S2-DEV-02 PR. |
| DB Admin | 6 | 6 | Migrations 007 to 011 and a search-performance check. |
| Tester | 6 | 6 | 30 customer + 32 product + 21 soft-delete cases, 36 permission results, 118 regression checks, 0 bugs. |
| UI/UX Designer | 5 | 5 | Built-screen review documents exist but results are still "Pending". |
| Scrum Master | 5 | 0 merged; 5 in review | This batch. |
| **Team total** | **30** | **23 merged + 2 ready + 5 in review** | |

Almost all merges came on D7 to D9: PRs remaining fell from 27 (end of D6) to 24 (D7), 8 (D8) and 0 (D9) (see `velocity-and-burndown.md`).

## 6. Blockers and open decisions

| # | Item | Needs | Owner |
|---|---|---|---|
| 1 | Module View controls: stored where, and do they gate module access? | Team decision (carried from Sprint 1, IMP-10) | Scrum Master |
| 2 | Real email delivery or console links (IMP-09) | Team decision | Scrum Master |
| 3 | Restore rules: who may restore, and what happens if a deleted parent still has deleted children (design item REF-04) | Team to confirm what was built: Admin-only restore; cannot restore under a deleted parent; delete blocked while active children exist | Developer, DB Admin, UI/UX |
| 4 | Built-screen usability review not yet performed (IMP-16) | Designer runs it on the final build | UI/UX Designer |
| 5 | Test results dated before the features were merged (IMP-17) | Tester reruns on the final build | Tester |
| 6 | Key rotation confirmation | Developer replies with the date | Developer |

## 7. Plan for the rest of the sprint (as set at the check point)

1. DB Admin merges S2-DBA-01 to 03 first; Developer starts customers, then products.
2. Tester starts each test file the day its screen is merged.
3. Each role posts one line of progress per day until the board catches up.
4. Scrum Master repeats the board check on D8 (velocity and burndown, S2-SM-04).
