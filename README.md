# NBA Playoffs Guessing Game

A small, private web app where a group of friends (≤10) submit per-series NBA Playoffs picks
(winner + exact games, e.g. "Celtics in 6") and get scored against frozen bet365-style odds.

## Scoring (per series)

Let the real result be `winner` in `N` games. For each user's pick `(team, games)`:

| Condition                                    | Points                          |
| -------------------------------------------- | ------------------------------- |
| `team != winner`                             | **0**                           |
| `team == winner` and `games != N`            | **winner-only odds** (e.g. 1.5) |
| `team == winner` and `games == N`            | **exact-score odds** (e.g. 5.7) |

Odds are frozen by the admin at the moment the series is created (10 values: 2 winner-only + 8 exact-score).

## Pick lifecycle

- **Before `lockTime`** (tipoff of Game 1): user creates/edits their pick; other users' picks are hidden.
- **At/after `lockTime`**: picks become read-only and publicly visible to all signed-in users.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Prisma ORM
  - Local dev: **SQLite** (zero install)
  - Production: **Postgres** (Neon free tier) — schema is kept Postgres-compatible
- NextAuth v5 with Resend magic-link email auth
- Zod for input validation
- SWR for leaderboard polling
- Vitest for unit tests on scoring logic

## Local setup

```bash
npm install
cp .env.example .env.local        # fill in values
npm run prisma:migrate            # creates prisma/dev.db
npm run db:seed                   # optional demo data
npm run dev
```

Visit http://localhost:3000.

## Environment variables

See `.env.example`. Required:

- `DATABASE_URL` — `file:./dev.db` locally; Neon Postgres URL in prod
- `NEXTAUTH_URL` — `http://localhost:3000` locally; prod URL in prod
- `NEXTAUTH_SECRET` — any long random string (use `openssl rand -base64 32`)
- `AUTH_RESEND_KEY` — Resend API key for sending magic-link emails
- `AUTH_EMAIL_FROM` — the "from" address (must be a verified domain in Resend, or use `onboarding@resend.dev` for testing)
- `ALLOWED_EMAILS` — comma-separated allow-list so only your friends can sign up

## Deployment

- **Hosting**: Vercel (personal account, Hobby plan)
- **Database**: Neon Postgres (free tier)
- **Email**: Resend (free tier)

Before first production deploy we swap the Prisma provider from `sqlite` to `postgresql` and regenerate migrations — the schema is simple enough that this is straightforward.

## Project layout

```
prisma/
  schema.prisma       # User, Series, SeriesOdds, Pick, SeriesResult
  seed.ts
src/
  app/                # routes (App Router)
  lib/
    auth.ts           # NextAuth config
    db.ts             # Prisma client singleton
    scoring.ts        # pure scorePick() — unit tested
    results-provider.ts
    zod-schemas.ts
  components/
tests/
  scoring.test.ts
```

## Security

- All DB access via Prisma (parameterized).
- Zod validation on every mutation.
- Admin-only routes guarded in `middleware.ts` + server-side `requireAdmin()`.
- Secrets only via env vars; `.env*` files are gitignored.

## License

Private project — no license granted.
