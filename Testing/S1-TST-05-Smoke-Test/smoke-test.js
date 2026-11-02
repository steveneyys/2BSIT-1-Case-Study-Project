// smoke-test.js  |  S1-TST-05 Automated smoke test: login and main page (Hope ERP)
// Run:  node smoke-test.js      (needs Node 18 or newer, no npm install)
//
// Set your real details with environment variables, or edit CONFIG below.
//   Windows (cmd):  set BASE_URL=http://localhost:6543 && set TEST_EMAIL=you@test.com && set TEST_PASSWORD=yourpass && node smoke-test.js
//   Mac/Linux:      BASE_URL=http://localhost:6543 TEST_EMAIL=you@test.com TEST_PASSWORD=yourpass node smoke-test.js

const CONFIG = {
  baseUrl: process.env.BASE_URL || "http://localhost:6543",
  loginPage: "/login",     // page that shows the login form
  loginApi: "/api/login",  // where the form sends the email and password (POST, JSON)
  mainPage: "/main",       // page shown after a successful login
  mainPageText: "Hope",    // a word that must appear on the main page
  email: process.env.TEST_EMAIL || "tester@test.com",
  password: process.env.TEST_PASSWORD || "",
};

const results = [];
function record(name, passed, detail) {
  results.push(passed);
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
}

// Turn the Set-Cookie headers into one Cookie header string
function cookieFrom(res) {
  const list = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return list.map((c) => c.split(";")[0]).join("; ");
}

async function login(password) {
  const res = await fetch(CONFIG.baseUrl + CONFIG.loginApi, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CONFIG.email, password }),
    redirect: "manual",
  });
  return { res, cookie: cookieFrom(res) };
}

async function run() {
  console.log(`Smoke test on ${CONFIG.baseUrl}\n`);

  // 1. Login page opens and has a password box
  try {
    const res = await fetch(CONFIG.baseUrl + CONFIG.loginPage);
    const html = await res.text();
    record("1. Login page opens", res.status === 200 && /type=["']password["']/i.test(html), `status ${res.status}`);
  } catch (e) {
    record("1. Login page opens", false, "cannot reach the server: " + e.message);
    return; // no point in the other checks
  }

  // 2. Main page is not open without login
  {
    const res = await fetch(CONFIG.baseUrl + CONFIG.mainPage, { redirect: "manual" });
    const blocked = [301, 302, 303, 307, 308, 401, 403].includes(res.status);
    record("2. Main page needs login", blocked, `status ${res.status}`);
  }

  // 3. Wrong password gives no session
  {
    const { res, cookie } = await login("definitely-the-wrong-password");
    record("3. Wrong password is rejected", cookie === "", `status ${res.status}, cookie ${cookie ? "given" : "none"}`);
  }

  // 4. Correct login gives a session
  const good = await login(CONFIG.password);
  const loggedIn = good.cookie !== "" && [200, 204, 301, 302, 303].includes(good.res.status);
  record("4. Login with correct password works", loggedIn, `status ${good.res.status}, cookie ${good.cookie ? "given" : "none"}`);

  // 5. Main page opens after login
  if (loggedIn) {
    const res = await fetch(CONFIG.baseUrl + CONFIG.mainPage, { headers: { Cookie: good.cookie }, redirect: "manual" });
    const html = await res.text();
    record("5. Main page opens after login", res.status === 200 && html.includes(CONFIG.mainPageText), `status ${res.status}`);
  } else {
    record("5. Main page opens after login", false, "skipped, login failed");
  }
}

run()
  .catch((e) => { console.log("ERROR: " + e.message); results.push(false); })
  .finally(() => {
    const passed = results.filter(Boolean).length;
    console.log(`\n${passed} of ${results.length} checks passed`);
    process.exit(passed === results.length && results.length > 0 ? 0 : 1);
  });
