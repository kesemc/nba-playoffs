/**
 * Bracket view-model: groups the flat list of Series rows into the shape
 * the /bracket page wants to render.
 *
 * Structure:
 *   R1 / R2 / CF are split by conference (East, West).
 *   F (NBA Finals) is a single list — it bridges both conferences.
 *
 * Each per-conference round is a *slot-indexed* array of fixed length
 * (4 for R1, 2 for R2, 1 for CF), with `null` for empty slots. Slot
 * positions are what visually align across rounds in the bracket grid.
 *
 * Slot-placement rules:
 *   - R1 (4 slots): filled by matching each series to the hardcoded
 *     `R1_LAYOUT` (per season). Unrecognized matchups fall back to
 *     `createdAt` order.
 *   - R2 (2 slots): each R2 series is placed by tracing its two teams
 *     back to their R1 series. The R1 slot index → "pair index"
 *     (slots 0–1 → pair 0 / top half, slots 2–3 → pair 1 / bottom half),
 *     and the R2 series goes into that pair. Falls back to `createdAt`
 *     order when parent R1 series aren't yet in the bracket.
 *   - CF (1 slot): only one slot per conference, no placement needed.
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

export type SlotArray = (BracketSeries | null)[];

export type ConferenceSplit = {
  east: SlotArray;
  west: SlotArray;
};

export type BracketData = {
  R1: ConferenceSplit;
  R2: ConferenceSplit;
  CF: ConferenceSplit;
  F: BracketSeries[];
};

const CONFERENCES = ["East", "West"] as const;
const R1_SLOTS = 4;
const R2_SLOTS = 2;
const CF_SLOTS = 1;

/**
 * 2026 NBA Playoffs first-round matchups, in the *vertical order* they
 * should appear in the bracket. R1 → R2 visual pairing follows
 * `floor(slot / 2)` (slots 0–1 → R2 top, slots 2–3 → R2 bottom), so
 * R2 placement only works if R1 is laid out in this order.
 *
 * Matching is order-insensitive — admin can create the series with
 * either team as teamA/teamB.
 *
 * If a series doesn't match any entry here (e.g. tests, or a future
 * season before this list is updated), it falls back to the next
 * free slot in `createdAt` order.
 *
 * To wire up a new season: replace the matchups below with that
 * year's R1 pairings in vertical bracket order. Nothing else needs
 * to change.
 */
const R1_LAYOUT: Record<Conference, ReadonlyArray<readonly [string, string]>> = {
  West: [
    ["Oklahoma City Thunder", "Phoenix Suns"],
    ["Los Angeles Lakers", "Houston Rockets"],
    ["San Antonio Spurs", "Portland Trail Blazers"],
    ["Minnesota Timberwolves", "Denver Nuggets"],
  ],
  East: [
    ["Detroit Pistons", "Orlando Magic"],
    ["Cleveland Cavaliers", "Toronto Raptors"],
    ["Boston Celtics", "Philadelphia 76ers"],
    ["New York Knicks", "Atlanta Hawks"],
  ],
};

function hardcodedR1Slot(s: BracketSeries, conf: Conference): number | null {
  const list = R1_LAYOUT[conf];
  for (let i = 0; i < list.length; i++) {
    const [a, b] = list[i];
    if (
      (s.teamA === a && s.teamB === b) ||
      (s.teamA === b && s.teamB === a)
    ) {
      return i;
    }
  }
  return null;
}

export function buildBracket(series: BracketSeries[]): BracketData {
  const data: BracketData = {
    R1: { east: emptySlots(R1_SLOTS), west: emptySlots(R1_SLOTS) },
    R2: { east: emptySlots(R2_SLOTS), west: emptySlots(R2_SLOTS) },
    CF: { east: emptySlots(CF_SLOTS), west: emptySlots(CF_SLOTS) },
    F: [],
  };

  const sorted = series
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Bucket by round + conference so we can apply per-round placement logic.
  const byRound: Record<Exclude<Round, "F">, Record<Conference, BracketSeries[]>> = {
    R1: { East: [], West: [] },
    R2: { East: [], West: [] },
    CF: { East: [], West: [] },
  };

  for (const s of sorted) {
    if (s.round === "F") {
      data.F.push(s);
      continue;
    }
    const conf = conferenceForSeries(s);
    if (!conf) {
      // Unknown conference (both teams missing metadata) — skip rather
      // than throw; the bracket should render even with partial data.
      continue;
    }
    byRound[s.round][conf].push(s);
  }

  // R1: place each series in its hardcoded R1_LAYOUT slot when the
  // matchup is recognized. Anything left over (tests, future seasons
  // before R1_LAYOUT is updated) falls back to the next free slot in
  // createdAt order.
  for (const conf of CONFERENCES) {
    const slots = sideOf(data.R1, conf);
    const unplaced: BracketSeries[] = [];
    for (const s of byRound.R1[conf]) {
      const slot = hardcodedR1Slot(s, conf);
      if (slot !== null && slots[slot] === null) {
        slots[slot] = s;
      } else {
        unplaced.push(s);
      }
    }
    for (const s of unplaced) {
      const free = slots.findIndex((x) => x === null);
      if (free !== -1) slots[free] = s;
      // else: more R1 series than slots — silently drop the overflow
      // to keep the bracket geometry consistent.
    }
  }

  // R2: place each series in the "pair" slot derived from its parents'
  // R1 slot positions. See module docstring.
  for (const conf of CONFERENCES) {
    const r1Slots = sideOf(data.R1, conf);
    const r2Slots = sideOf(data.R2, conf);

    // team -> pair index based on which R1 slot the team played in.
    const teamToPair = new Map<string, number>();
    r1Slots.forEach((s, i) => {
      if (!s) return;
      const pair = Math.floor(i / 2);
      teamToPair.set(s.teamA, pair);
      teamToPair.set(s.teamB, pair);
    });

    for (const s of byRound.R2[conf]) {
      // If both teams trace to the same pair, that's our slot. If only one
      // is known, trust it. If neither, fall back to first free slot
      // (preserving createdAt order for that fallback path).
      const pairA = teamToPair.get(s.teamA);
      const pairB = teamToPair.get(s.teamB);
      const target = pairA ?? pairB;

      if (target !== undefined && r2Slots[target] === null) {
        r2Slots[target] = s;
        continue;
      }
      const free = r2Slots.findIndex((x) => x === null);
      if (free !== -1) r2Slots[free] = s;
      // else: more R2 series than slots — silently drop the overflow,
      // matching the existing R1 cap behavior.
    }
  }

  // CF: only one slot per conference, fill from createdAt order.
  for (const conf of CONFERENCES) {
    const slot = sideOf(data.CF, conf);
    const first = byRound.CF[conf][0];
    if (first) slot[0] = first;
  }

  return data;
}

function emptySlots(n: number): SlotArray {
  return Array.from({ length: n }, () => null);
}

function sideOf(split: ConferenceSplit, conf: Conference): SlotArray {
  return conf === "East" ? split.east : split.west;
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
