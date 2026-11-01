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

Besa, Matthew Ben Anthony S.

## Database Setup

You need: Node.js 18+ and Git. No Docker.

### First-time setup
1. Clone the repo and open the folder in a terminal.
2. Run `npm install`.
3. Copy `.env.example` to `.env` (Mac/Linux: `cp .env.example .env`, Windows: `copy .env.example .env`).
4. Open `.env` and paste the team's `DATABASE_URL` (ask the DB Admin, use the Session pooler string, never share it in public chat).
5. Run `npm run db:ping`. You should see `Connected to postgres ...`.
6. Run `npm run migrate`. You should see `Database is up to date.` (or each migration applied).

### Daily use
- Pulled new code? Run `npm run migrate` again. It only applies new files.
- Never edit a migration that is already merged. Add a new numbered file instead.
- Never commit `.env`.

### If something fails
| Message | Fix |
|---|---|
| `DATABASE_URL is missing` | You skipped step 3 or 4 |
| `ENOTFOUND` or timeout | Check the URL and your internet. Use the Session pooler string, not the direct one |
| `password authentication failed` | Wrong password in `.env` |
| `FAILED 00X_...` | Nothing was half-applied. Send the full message to the DB Admin |
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
