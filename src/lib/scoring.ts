/**
 * Scoring — pure, side-effect free, unit-tested.
 *
 * Rules (per series, applied once the real result is known):
 *   - Wrong team              -> 0
 *   - Right team, wrong games -> winner-only odds (bet365 decimal)
 *   - Right team, exact games -> winner-only odds + EXACT_GAMES_BONUS
 *
 * Why not use bet365 exact-score odds directly as the exact-match payout?
 * Early simulation (scripts/simulate-scoring.ts) showed that for small pools
 * those payouts (5-30+ points) create runaway variance: one lucky guess can
 * dominate a 15-series tournament. A flat bonus on top of the winner odds
 * keeps the upset incentive proportional to difficulty while capping how
 * much any single series can swing the standings.
 */

export const EXACT_GAMES_BONUS = 3;

export type Pick = { team: string; games: number };
export type Result = { winner: string; games: number };

// Row shape used by scoring — mirrors SeriesOdds but decoupled from Prisma types
// so the same function is usable from any call-site (scripts, tests, UI).
// For the active scoring rule we only consult rows with games === null
// (winner-only odds). Exact-games rows, if present, are ignored by scoring
// but may still be rendered for reference.
export type OddsRow = { team: string; games: number | null; odds: number };

export function scorePick(
  pick: Pick,
  result: Result,
  odds: OddsRow[],
): number {
  if (pick.team !== result.winner) return 0;

  const winnerOnly = odds.find(
    (o) => o.team === result.winner && o.games === null,
  );
  const base = winnerOnly?.odds ?? 0;

  if (pick.games === result.games) {
    return base + EXACT_GAMES_BONUS;
  }
  return base;
}

export function roundNumber(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
