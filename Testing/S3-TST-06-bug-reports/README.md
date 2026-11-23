# S3-TST-06 Bug Reports and Fix Verification

**System:** Hope ERP  **Sprint:** 3  **Tester:** Llabres

## How to use

1. When a test fails in S3-TST-01 to S3-TST-05, add one row to the Bug List and fill the template for that bug.
2. When the developer says the bug is **Fixed**, repeat the same steps and write the result in Fix Verification.
3. If the retest passes, set the bug to **Closed**. If it fails, set it to **Reopened**.
4. Also re-run the related test cases to check that the fix did not break something else.

## Severity

| Severity | Meaning | Examples |
|---|---|---|
| Critical | System unusable, security or rights broken | A User without View Job History can see salaries; deleted employees visible to a User |
| High | Main feature fails and there is no workaround | Add Employee does not save; current job is wrong |
| Medium | Feature partly works or there is a workaround | Wrong error message; search does not clear |
| Low | Small look or wording problem | Typo, spacing, colour |

## Status

New, In Progress, Fixed, Reopened, Closed, Rejected. **Open** bugs are New, In Progress, Fixed or Reopened.

**Acceptance criterion:** no open Critical or High bugs at the end of the sprint.

## Bug List

All tests in S3-TST-01 to S3-TST-05 passed, so no bugs were found and none were reported this sprint.

| Bug ID | Date Found | Related Test | Module / Feature | Title | Severity | Status | Assigned To | Remarks |
|---|---|---|---|---|---|---|---|---|
| None | - | - | - | No bugs found | - | - | - | All tests passed |

## Bug Report Template

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

## Fix Verification (retest)

No bugs were reported, so no fix verification was needed.

| Bug ID | Fix PR link | Date Fixed | Retest Date | Retested By | Same steps repeated? | Retest Result | Related tests re-run | New bug found? | Remarks |
|---|---|---|---|---|---|---|---|---|---|
| None | - | - | - | - | - | - | - | No | No bugs to retest |

## Summary

| Severity | New | In Progress | Fixed | Reopened | Closed | Rejected | Open |
|---|---|---|---|---|---|---|---|
| Critical | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| High | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Low | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

**Open Critical + High bugs:** 0

**Acceptance criterion (no open Critical or High):** MET
