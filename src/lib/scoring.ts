/**
 * Scoring — pure, side-effect free, unit-tested.
 *
 * Rules (per series, applied once the real result is known):
 *   - Wrong team             -> 0
 *   - Right team, wrong games -> winner-only odds (games = null in SeriesOdds)
 *   - Right team, exact games -> exact-score odds (games = actual N)
 */

export type Pick = { team: string; games: number };
export type Result = { winner: string; games: number };

// Row shape used by scoring — mirrors SeriesOdds but decoupled from Prisma types
// so the same function is usable from any call-site (scripts, tests, UI).
export type OddsRow = { team: string; games: number | null; odds: number };

export function scorePick(
  pick: Pick,
  result: Result,
  odds: OddsRow[],
): number {
  if (pick.team !== result.winner) return 0;

  if (pick.games === result.games) {
    const exact = odds.find(
      (o) => o.team === result.winner && o.games === result.games,
    );
    if (exact) return exact.odds;
    // Fallback: if exact-score odds somehow weren't stored, fall through to
    // winner-only odds rather than silently dropping the pick to 0.
  }

  const winnerOnly = odds.find(
    (o) => o.team === result.winner && o.games === null,
  );
  return winnerOnly?.odds ?? 0;
}

export function roundNumber(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
