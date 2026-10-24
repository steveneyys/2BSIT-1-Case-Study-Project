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
