# IT's over

Alcantara, Steven Ace F.

Gala, Dan Jewel N.

Llabres, Lem M.

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
| `ENOTFOUND` or timeout | Check the URL and your internet. Ask the DB Admin for the Session pooler string if the direct one fails |
| `password authentication failed` | Wrong password in `.env` |
| `FAILED 00X_...` | Nothing was half-applied. Send the full message to the DB Admin |
