# S1-TST-06 Bug Reports and Fix Verification

**System:** Hope ERP  **Sprint:** 1  **Tester:** Llabres

## How to use

1. When a test case in TST-02 to TST-05 fails, add one row to the Bug List and fill the Bug Report Template for that bug (one bug per row). Put the failed Test ID in "Related Test".
2. When the developer says the bug is **Fixed**, repeat the same steps and write the result in the Fix Verification table.
3. If the retest passes, set the bug Status to **Closed**. If it fails, set it to **Reopened**.
4. Also re-run the related test cases to check that the fix did not break something else.

## Severity

| Severity | Meaning | Examples |
|---|---|---|
| Critical | System unusable, security or rights broken | Cannot log in; a User can open something the rights deny; Admin can edit a Superadmin; last Superadmin can be blocked |
| High | Main feature fails and there is no workaround | Reset password email is never sent; Add User does not save |
| Medium | Feature partly works or there is a workaround | Wrong error message; list does not refresh until the page is reloaded |
| Low | Small look or wording problem | Typo, spacing, colour, misaligned button |

## Status

| Status | Meaning |
|---|---|
| New | Just reported |
| In Progress | Developer is working on it |
| Fixed | Developer says it is done, waiting for the tester's retest |
| Reopened | The retest failed |
| Closed | The retest passed |
| Rejected | Not a bug or a duplicate (write why in Remarks) |

**Open** bugs are New, In Progress, Fixed or Reopened.

**Acceptance criterion:** no open Critical or High bugs at the end of the sprint.

## Bug List

| Bug ID | Date Found | Related Test | Module / Feature | Title | Severity | Status | Assigned To | Remarks |
|---|---|---|---|---|---|---|---|---|
| EXAMPLE | 2026-10-24 | TC-LOG-06 | Login / Logout | Protected page shows again after logout when Back is pressed | High | New | | Example only, not a real bug. Delete this row. |
| BUG-001 | | | | | | | | |
| BUG-002 | | | | | | | | |
| BUG-003 | | | | | | | | |
| BUG-004 | | | | | | | | |
| BUG-005 | | | | | | | | |
| BUG-006 | | | | | | | | |
| BUG-007 | | | | | | | | |
| BUG-008 | | | | | | | | |
| BUG-009 | | | | | | | | |
| BUG-010 | | | | | | | | |

## Bug Report Template

Copy this for each bug (for example, as a GitHub Issue or under the Bug List).

```
Bug ID:
Date found:
Reported by: Llabres
Related test ID:
Module / feature:
Title:
Severity: (Critical / High / Medium / Low)
Status: New
Assigned to:

Steps to reproduce:
1.
2.
3.

Expected result:

Actual result:

Evidence: (screenshot file name or link)
Environment: (browser, link, test account used)
Remarks:
```

**Example (not a real bug):**

```
Bug ID: EXAMPLE
Date found: 2026-10-24
Reported by: Llabres
Related test ID: TC-LOG-06
Module / feature: Login / Logout
Title: Protected page shows again after logout when Back is pressed
Severity: High
Status: New
Assigned to:

Steps to reproduce:
1. Log in as the approved User
2. Click Logout
3. Press the browser Back button

Expected result:
Protected page is not shown, asks for login

Actual result:
The main page is shown again with the user's data

Evidence:
Environment: Chrome, localhost
Remarks: Example only, not a real bug.
```

## Fix Verification (retest)

| Bug ID | Fix PR link | Date Fixed | Retest Date | Retested By | Same steps repeated? | Retest Result | Related tests re-run | New bug found? | Remarks |
|---|---|---|---|---|---|---|---|---|---|
| EXAMPLE | (PR link) | 2026-10-27 | 2026-10-28 | Llabres | Yes | Pass | TC-LOG-05, TC-LOG-06, TC-LOG-07 | No | Example only. After Pass, set the bug to Closed. |
| | | | | | | | | | |
| | | | | | | | | | |
| | | | | | | | | | |

## Summary (update at the end of the sprint)

| Severity | New | In Progress | Fixed | Reopened | Closed | Rejected | Open |
|---|---|---|---|---|---|---|---|
| Critical | | | | | | | |
| High | | | | | | | |
| Medium | | | | | | | |
| Low | | | | | | | |

**Open Critical + High bugs:**

**Acceptance criterion (no open Critical or High):** MET / NOT MET
