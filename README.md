# Hope, Inc. ERP

Node.js + Express + PostgreSQL (Supabase). No Docker.

## Run locally
1. Install Node 20.12 or newer.
2. `npm install`
3. `cp .env.example .env` and set `DATABASE_URL` (Supabase: Project Settings -> Database -> Connection string -> Session pooler) and `SESSION_SECRET`.
4. `npm run dev`, then open http://localhost:3000
5. Verify the DB link: http://localhost:3000/api/health/db should return `{"status":"ok","database":"connected"}`.

## Scripts
- `npm start` run the server, `npm run dev` run with auto-reload, `npm test` run tests

## Layout
- `src/config.js` env loading and validation (fails fast)
- `src/db.js` PostgreSQL pool wrapper (`db.query(sql, params)`)
- `src/app.js` Express app factory; `src/server.js` entry point
- `src/routes/` route modules; `src/middleware/` shared middleware
- `db/migrations/` SQL migrations (owned by the DB Admin, S1-DBA-01)
- `public/` static files

Never commit `.env`. Always use parameterized queries (`$1, $2`), never string-built SQL.

## API
- `POST /api/auth/register` body `{firstName,lastName,email,password,confirmPassword}` -> 201 (account created as `user`, status `pending`), 400 (field errors), 409 (email taken), 429 (rate limited)
- `POST /api/auth/login` `{email,password}` -> 200 + session cookie; 401 generic error; 403 blocked/pending (only after a correct password)
- `POST /api/auth/logout`, `GET /api/auth/me` (requires sign-in)
- `POST /api/auth/set-password` `{token,password,confirmPassword}` one-time link; `node scripts/create-set-password-link.js <email>` prints a link for a seeded user
- Protect routes with `requireAuth` / `requireRole('admin','superadmin')` from `src/middleware/auth.js`
- `POST /api/auth/forgot-password` `{email}` -> always 200 with the same message; emails a 1-hour single-use link to `/reset-password.html?token=...`. The link is submitted to `/api/auth/set-password`. Without `SMTP_HOST` the email is printed in the server console.
- User Management (admin/superadmin only; plain users get 403): `GET /api/users?q=`, `POST /api/users`, `PATCH /api/users/:id`, `POST /api/users/:id/block|unblock`. Admins see users and admins but never superadmins, and manage users only. UI: `/users.html`.

- Superadmin only: `POST /api/users/:id/approve`, `/make-admin`, `/remove-admin`. The last live superadmin can never be blocked or demoted (409).