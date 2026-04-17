# NBA Playoffs Guessing Game

A small, private web app where a group of friends (≤10) submit per-series NBA Playoffs picks
(winner + exact games, e.g. "Celtics in 6") and get scored against frozen bet365-style odds.

## Scoring (per series)

Let the real result be `winner` in `N` games. For each user's pick `(team, games)`:

| Condition                                    | Points                               |
| -------------------------------------------- | ------------------------------------ |
| `team != winner`                             | **0**                                |
| `team == winner` and `games != N`            | **winner-only odds** (e.g. 1.5)      |
| `team == winner` and `games == N`            | **winner-only odds + 3 bonus**       |

Odds are frozen by the admin when the series is created (2 values: decimal "to win series" odds for each team).

### Why a flat +3 instead of bet365 exact-score odds?

Early simulation against last year's playoffs (see `scripts/simulate-scoring.ts`) showed that
using bet365 exact-score odds directly (values ranging 4–30+) creates runaway variance: one
lucky exact-score call can dominate a 15-series tournament, overshadowing consistent skill.

The flat `+3` bonus preserves the upset incentive — picking a cinderella at 8.0 odds still pays
way more than picking a 1.5 favorite — while capping how much any single series can swing the
standings. Under simulation, this cut the score spread roughly in half (range 47 → 30) without
killing motivation to call underdog series.

The constant lives in [`src/lib/scoring.ts`](src/lib/scoring.ts) as `EXACT_GAMES_BONUS` if you
ever want to tweak it.

## Pick lifecycle

- **Before `lockTime`** (tipoff of Game 1): user creates/edits their pick; other users' picks are hidden.
- **At/after `lockTime`**: picks become read-only and publicly visible to all signed-in users.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Prisma ORM over **Postgres** (Neon free tier) for both local dev and production
- NextAuth v5 with Resend magic-link email auth
- Zod for input validation
- SWR for leaderboard polling
- Vitest for unit tests on scoring logic

## Local setup

```bash
npm install
cp .env.example .env              # fill in DATABASE_URL + AUTH_* values
npm run prisma:migrate            # applies migrations to Neon
npm run db:seed                   # optional demo data
npm run dev
```

Visit http://localhost:3000.

## Environment variables

See `.env.example`. Required:

- `DATABASE_URL` — Neon Postgres connection string
- `AUTH_URL` — `http://localhost:3000` locally; prod URL in prod
- `AUTH_SECRET` — any long random string (`openssl rand -base64 32`)
- `AUTH_RESEND_KEY` — Resend API key for sending magic-link emails
- `AUTH_EMAIL_FROM` — "from" address (verified domain in Resend, or `onboarding@resend.dev` for quick testing)
- `ALLOWED_EMAILS` — comma-separated allow-list so only your friends can sign up
- `POOL_ADMIN_CONTACT` — *(optional)* displayed to rejected sign-in attempts so they know how to reach you (email, phone, Telegram handle, etc.)

Optional (prize pool display — set to enable the pot card on the dashboard):

- `POOL_ENTRY_FEE` — numeric entry fee per player, e.g. `50`. Leave empty to hide pool UI.
- `POOL_CURRENCY_SYMBOL` — currency symbol, default `₪`.
- `POOL_PLAYER_COUNT` — optional explicit entrant count. If empty, the app counts all registered users.

### Prize structure

If the prize pool env vars are set, the dashboard shows a pot card and the leaderboard shows projected payouts per rank:

| Rank            | Share |
| --------------- | ----: |
| 1st place       |   55% |
| 2nd place       |   25% |
| 3rd place       |   10% |
| Red Lantern (last) | 10% |

The app never moves real money — it only displays who is owed what. Cash is handled between players. The structure lives in [`src/lib/prize-pool.ts`](src/lib/prize-pool.ts) if you want to tweak percentages or add sidequests.

## Deployment

- **Hosting**: Vercel (personal account, Hobby plan)
- **Database**: Neon Postgres (free tier)
- **Email**: Resend (free tier)

Set `DATABASE_URL`, `AUTH_URL`, `AUTH_SECRET`, `AUTH_RESEND_KEY`,
`AUTH_EMAIL_FROM`, and `ALLOWED_EMAILS` as Vercel project env vars.

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
