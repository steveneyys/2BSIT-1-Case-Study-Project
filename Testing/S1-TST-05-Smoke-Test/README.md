# S1-TST-05 Automated Smoke Test: Login and Main Page

**System:** Hope ERP  **Sprint:** 1  **Tester:** Llabres  **Date tested:** 2026-11-02

**File:** `smoke-test.js` (JavaScript, Node.js 18 or newer, no npm install needed)

## What it checks

| # | Check | Pass when |
|---|---|---|
| 1 | Login page opens | Status 200 and the page has a password box |
| 2 | Main page needs login | Without login, the main page redirects or returns 401/403 |
| 3 | Wrong password is rejected | No session cookie is given |
| 4 | Login with correct password works | Status OK and a session cookie is given |
| 5 | Main page opens after login | Status 200 and the page has the expected text |

The script prints PASS or FAIL for each check. The exit code is 0 if all checks pass, and 1 if any fails.

## How to run

```bash
# Mac / Linux
BASE_URL=http://localhost:6543 TEST_EMAIL=you@test.com TEST_PASSWORD=yourpass node smoke-test.js

# Windows (cmd)
set BASE_URL=http://localhost:6543 && set TEST_EMAIL=you@test.com && set TEST_PASSWORD=yourpass && node smoke-test.js
```

The password is not typed inside the file.

## Result on the real system

| Date | Result | Notes |
|---|---|---|
| 2026-11-02 | 5 of 5 checks passed | All 5 checks PASS |
