/**
 * Bracket view-model: groups the flat list of Series rows into the shape
 * the /bracket page wants to render.
 *
 * Structure:
 *   R1 / R2 / CF are split by conference (East, West)
 *   F (NBA Finals) is a single list — it bridges both conferences.
 *
 * Within each bucket, series are ordered by creation time so the admin can
 * control display order by the order in which they enter series. This is
 * a pragmatic stand-in for "bracket slot position" which we don't track
 * explicitly; good enough for a 10-person pool.
 *
 * Conference assignment for a matchup uses either team's conference (both
 * teams are in the same conference for R1 / R2 / CF by definition). For
 * the NBA Finals the two teams are from different conferences so we skip
 * the split.
 */

import { getTeamConference, type Conference, type Round } from "@/lib/teams";

export type BracketSeries = {
  id: string;
  round: Round;
  teamA: string;
  teamB: string;
  result: { winner: string; games: number } | null;
  createdAt: Date;
};

export type ConferenceSplit = {
  east: BracketSeries[];
  west: BracketSeries[];
};

export type BracketData = {
  R1: ConferenceSplit;
  R2: ConferenceSplit;
  CF: ConferenceSplit;
  F: BracketSeries[];
};

export function buildBracket(series: BracketSeries[]): BracketData {
  const empty: BracketData = {
    R1: { east: [], west: [] },
    R2: { east: [], west: [] },
    CF: { east: [], west: [] },
    F: [],
  };

  const sorted = series
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const s of sorted) {
    if (s.round === "F") {
      empty.F.push(s);
      continue;
    }
    const conf = conferenceForSeries(s);
    if (!conf) {
      // Unknown conference (both teams missing metadata) — skip rather
      // than throw; the bracket should render even with partial data.
      continue;
    }
    const bucket = empty[s.round];
    if (conf === "East") bucket.east.push(s);
    else bucket.west.push(s);
  }

  return empty;
}

/**
 * Picks a single conference for a series card. R1/R2/CF are intra-conference
 * so both teams agree; we look at teamA first, fall back to teamB if teamA
 * isn't in TEAM_META.
 */
function conferenceForSeries(s: BracketSeries): Conference | null {
  return (
    getTeamConference(s.teamA) ?? getTeamConference(s.teamB) ?? null
  );
}

/**
 * Returns how many games a particular team won, given a series result.
 *
 * `result.games` is the *total series length* (4–7). In a best-of-7, the
 * winner clinches at exactly 4 wins and the loser won the rest:
 *
 *   ended in 4 → 4–0    ended in 6 → 4–2
 *   ended in 5 → 4–1    ended in 7 → 4–3
 *
 * Returns null when there's no result yet.
 */
export function gamesWonBy(
  team: string,
  result: { winner: string; games: number } | null,
): number | null {
  if (!result) return null;
  if (team === result.winner) return 4;
  return result.games - 4;
}
