# S1-TST-05 Automated Smoke Test: Login and Main Page

**System:** Hope ERP  **Sprint:** 1  **Tester:** Llabres

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

1. Start Hope ERP on your computer.
2. Open a terminal in the folder of `smoke-test.js`.
3. Run (use the real link, test email and password):

```bash
# Mac / Linux
BASE_URL=http://localhost:3000 TEST_EMAIL=you@test.com TEST_PASSWORD=yourpass node smoke-test.js

# Windows (cmd)
set BASE_URL=http://localhost:3000 && set TEST_EMAIL=you@test.com && set TEST_PASSWORD=yourpass && node smoke-test.js
```

Do not type the password inside the file.

## Before the first real run

Edit the `CONFIG` part at the top of `smoke-test.js` to match the real system:

- `loginPage`, `loginApi` and `mainPage` must be the real paths.
- The script assumes the login sends the email and password as JSON and gives a session cookie. If the login works differently (for example Supabase Auth), check 4 must be changed.
- `mainPageText` must be a word that really appears on the main page.

## Sample output

This was run on a small practice server, **not on the real Hope ERP**:

```
Smoke test on http://localhost:3000

PASS  1. Login page opens  (status 200)
PASS  2. Main page needs login  (status 302)
PASS  3. Wrong password is rejected  (status 401, cookie none)
PASS  4. Login with correct password works  (status 200, cookie given)
PASS  5. Main page opens after login  (status 200)

5 of 5 checks passed
```

## Result on the real system

| Date | Result | Notes |
|---|---|---|
| | | |
