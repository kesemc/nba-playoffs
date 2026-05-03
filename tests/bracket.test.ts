import { describe, expect, it } from "vitest";
import { buildBracket, gamesWonBy, type BracketSeries } from "../src/lib/bracket";

function makeSeries(
  id: string,
  round: BracketSeries["round"],
  teamA: string,
  teamB: string,
  createdOffsetMs = 0,
  result: BracketSeries["result"] = null,
): BracketSeries {
  return {
    id,
    round,
    teamA,
    teamB,
    createdAt: new Date(1_700_000_000_000 + createdOffsetMs),
    result,
  };
}

function ids(slots: ReadonlyArray<BracketSeries | null>): (string | null)[] {
  return slots.map((s) => s?.id ?? null);
}

describe("buildBracket", () => {
  it("returns empty slot arrays of the right shape for empty input", () => {
    const b = buildBracket([]);
    expect(b.R1.east).toEqual([null, null, null, null]);
    expect(b.R1.west).toEqual([null, null, null, null]);
    expect(b.R2.east).toEqual([null, null]);
    expect(b.R2.west).toEqual([null, null]);
    expect(b.CF.east).toEqual([null]);
    expect(b.CF.west).toEqual([null]);
    expect(b.F).toEqual([]);
  });

  it("groups R1 series by conference via team metadata", () => {
    const b = buildBracket([
      makeSeries("e1", "R1", "Boston Celtics", "Miami Heat", 0),
      makeSeries("w1", "R1", "Denver Nuggets", "Los Angeles Lakers", 1),
      makeSeries("e2", "R1", "New York Knicks", "Philadelphia 76ers", 2),
      makeSeries("w2", "R1", "Oklahoma City Thunder", "Memphis Grizzlies", 3),
    ]);
    expect(ids(b.R1.east)).toEqual(["e1", "e2", null, null]);
    expect(ids(b.R1.west)).toEqual(["w1", "w2", null, null]);
  });

  it("falls back to createdAt order for R2 when no R1 parents exist", () => {
    const b = buildBracket([
      makeSeries("e-later", "R2", "Boston Celtics", "Miami Heat", 100),
      makeSeries("e-earlier", "R2", "New York Knicks", "Philadelphia 76ers", 0),
    ]);
    // No R1 series → can't trace pairs → fall back to first free slot in
    // createdAt order. Earlier series goes to slot 0, later to slot 1.
    expect(ids(b.R2.east)).toEqual(["e-earlier", "e-later"]);
  });

  it("puts Finals into the shared F bucket (no conference split)", () => {
    const b = buildBracket([
      makeSeries("finals", "F", "Boston Celtics", "Denver Nuggets", 0, {
        winner: "Denver Nuggets",
        games: 5,
      }),
    ]);
    expect(b.F.map((s) => s.id)).toEqual(["finals"]);
    expect(ids(b.R1.east)).toEqual([null, null, null, null]);
    expect(ids(b.R1.west)).toEqual([null, null, null, null]);
  });

  it("carries results through to the bracket series objects", () => {
    const result = { winner: "Boston Celtics", games: 6 };
    const b = buildBracket([
      makeSeries("done", "CF", "Boston Celtics", "Miami Heat", 0, result),
    ]);
    expect(b.CF.east[0]?.result).toEqual(result);
  });

  it("silently skips series whose teams aren't in TEAM_META", () => {
    const b = buildBracket([
      makeSeries("bogus", "R1", "Fictional Team", "Imaginary Squad", 0),
    ]);
    expect(ids(b.R1.east)).toEqual([null, null, null, null]);
    expect(ids(b.R1.west)).toEqual([null, null, null, null]);
  });

  it("handles a full bracket across all rounds", () => {
    const b = buildBracket([
      // R1 East: 4 series
      makeSeries("e1", "R1", "Boston Celtics", "Miami Heat", 0),
      makeSeries("e2", "R1", "New York Knicks", "Philadelphia 76ers", 1),
      makeSeries("e3", "R1", "Milwaukee Bucks", "Indiana Pacers", 2),
      makeSeries("e4", "R1", "Cleveland Cavaliers", "Orlando Magic", 3),
      // R1 West: 4 series
      makeSeries("w1", "R1", "Oklahoma City Thunder", "New Orleans Pelicans", 4),
      makeSeries("w2", "R1", "Denver Nuggets", "Los Angeles Lakers", 5),
      makeSeries("w3", "R1", "Minnesota Timberwolves", "Phoenix Suns", 6),
      makeSeries("w4", "R1", "LA Clippers", "Dallas Mavericks", 7),
      // R2 (Celtics from R1 slot 0, Cavaliers from R1 slot 3 → both teams
      // disagree on pair; first non-null wins → slot 0)
      makeSeries("r2e1", "R2", "Boston Celtics", "Cleveland Cavaliers", 8),
      // CF
      makeSeries("cfw", "CF", "Denver Nuggets", "Minnesota Timberwolves", 9),
      // Finals
      makeSeries("finals", "F", "Boston Celtics", "Denver Nuggets", 10),
    ]);
    expect(b.R1.east).toHaveLength(4);
    expect(b.R1.west).toHaveLength(4);
    expect(b.R2.east).toHaveLength(2);
    expect(b.CF.west).toHaveLength(1);
    expect(b.F).toHaveLength(1);
  });

  // The visual bracket pairs R1 slots 0+1 → R2 slot 0 and R1 slots 2+3 →
  // R2 slot 1. Before this fix, R2 placement was naive createdAt order,
  // so a single R2 series whose parents were in R1 slots 2-3 still
  // landed in R2 slot 0 (top half), pairing visually with the wrong
  // first-round series. See user report: "the second round is
  // knicks/philadelphia but they don't show up on the correct place".
  describe("R2 slot placement (regression for the playoffs '26 layout bug)", () => {
    it("places R2 in the bottom half when its teams come from R1 slots 2-3", () => {
      const b = buildBracket([
        // East R1: bottom half slots 2-3 contain Boston/Philly + Knicks/Hawks
        makeSeries("e1", "R1", "Detroit Pistons", "Orlando Magic", 0),
        makeSeries("e2", "R1", "Cleveland Cavaliers", "Toronto Raptors", 1),
        makeSeries("e3", "R1", "Boston Celtics", "Philadelphia 76ers", 2),
        makeSeries("e4", "R1", "New York Knicks", "Atlanta Hawks", 3),
        // R2: Knicks (R1 slot 3) vs Philly (R1 slot 2) — both pair 1.
        makeSeries("r2_knicks_philly", "R2", "New York Knicks", "Philadelphia 76ers", 100),
      ]);
      expect(ids(b.R2.east)).toEqual([null, "r2_knicks_philly"]);
    });

    it("places R2 in the top half when its teams come from R1 slots 0-1", () => {
      const b = buildBracket([
        makeSeries("w1", "R1", "Oklahoma City Thunder", "Phoenix Suns", 0),
        makeSeries("w2", "R1", "Los Angeles Lakers", "Houston Rockets", 1),
        makeSeries("w3", "R1", "San Antonio Spurs", "Portland Trail Blazers", 2),
        makeSeries("w4", "R1", "Minnesota Timberwolves", "Denver Nuggets", 3),
        // R2: OKC (slot 0) vs Lakers (slot 1) — both pair 0.
        makeSeries("r2_okc_lakers", "R2", "Oklahoma City Thunder", "Los Angeles Lakers", 100),
      ]);
      expect(ids(b.R2.west)).toEqual(["r2_okc_lakers", null]);
    });

    it("places two R2 series in their respective pairs (not by createdAt)", () => {
      const b = buildBracket([
        makeSeries("w1", "R1", "Oklahoma City Thunder", "Phoenix Suns", 0),
        makeSeries("w2", "R1", "Los Angeles Lakers", "Houston Rockets", 1),
        makeSeries("w3", "R1", "San Antonio Spurs", "Portland Trail Blazers", 2),
        makeSeries("w4", "R1", "Minnesota Timberwolves", "Denver Nuggets", 3),
        // The bottom-half R2 happens to be created first; should still
        // land in slot 1 (bottom half), not slot 0.
        makeSeries("r2_bottom", "R2", "San Antonio Spurs", "Minnesota Timberwolves", 100),
        makeSeries("r2_top", "R2", "Oklahoma City Thunder", "Los Angeles Lakers", 200),
      ]);
      expect(ids(b.R2.west)).toEqual(["r2_top", "r2_bottom"]);
    });
  });
});

describe("gamesWonBy", () => {
  const winner = "Boston Celtics";
  const loser = "Miami Heat";

  it("returns null when there's no result yet", () => {
    expect(gamesWonBy(winner, null)).toBeNull();
    expect(gamesWonBy(loser, null)).toBeNull();
  });

  it("winner always won exactly 4 games (regardless of series length)", () => {
    for (const games of [4, 5, 6, 7]) {
      expect(gamesWonBy(winner, { winner, games })).toBe(4);
    }
  });

  it("loser won (length - 4) games", () => {
    expect(gamesWonBy(loser, { winner, games: 4 })).toBe(0); // sweep
    expect(gamesWonBy(loser, { winner, games: 5 })).toBe(1); // 4-1
    expect(gamesWonBy(loser, { winner, games: 6 })).toBe(2); // 4-2
    expect(gamesWonBy(loser, { winner, games: 7 })).toBe(3); // 4-3
  });

  it("regression: 5-game series renders as 4-1, not 5-1", () => {
    // The bug was that the winner row was showing `result.games` (the
    // series length) instead of the winner's wins (always 4). For Spurs
    // /Trail Blazers ending in 5 games, the bracket displayed "5-1".
    const result = { winner, games: 5 };
    expect(gamesWonBy(winner, result)).toBe(4);
    expect(gamesWonBy(loser, result)).toBe(1);
  });
});
