import { describe, expect, it } from "vitest";
import { buildBracket, type BracketSeries } from "../src/lib/bracket";

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

describe("buildBracket", () => {
  it("returns empty buckets for empty input", () => {
    const b = buildBracket([]);
    expect(b.R1.east).toEqual([]);
    expect(b.R1.west).toEqual([]);
    expect(b.R2.east).toEqual([]);
    expect(b.R2.west).toEqual([]);
    expect(b.CF.east).toEqual([]);
    expect(b.CF.west).toEqual([]);
    expect(b.F).toEqual([]);
  });

  it("groups R1 series by conference via team metadata", () => {
    const b = buildBracket([
      makeSeries("e1", "R1", "Boston Celtics", "Miami Heat", 0),
      makeSeries("w1", "R1", "Denver Nuggets", "Los Angeles Lakers", 1),
      makeSeries("e2", "R1", "New York Knicks", "Philadelphia 76ers", 2),
      makeSeries("w2", "R1", "Oklahoma City Thunder", "Memphis Grizzlies", 3),
    ]);
    expect(b.R1.east.map((s) => s.id)).toEqual(["e1", "e2"]);
    expect(b.R1.west.map((s) => s.id)).toEqual(["w1", "w2"]);
  });

  it("preserves creation order within a bucket", () => {
    const b = buildBracket([
      makeSeries("e-later", "R2", "Boston Celtics", "Miami Heat", 100),
      makeSeries("e-earlier", "R2", "New York Knicks", "Philadelphia 76ers", 0),
    ]);
    expect(b.R2.east.map((s) => s.id)).toEqual(["e-earlier", "e-later"]);
  });

  it("puts Finals into the shared F bucket (no conference split)", () => {
    const b = buildBracket([
      makeSeries("finals", "F", "Boston Celtics", "Denver Nuggets", 0, {
        winner: "Denver Nuggets",
        games: 5,
      }),
    ]);
    expect(b.F.map((s) => s.id)).toEqual(["finals"]);
    expect(b.R1.east).toHaveLength(0);
    expect(b.R1.west).toHaveLength(0);
  });

  it("carries results through to the bracket series objects", () => {
    const result = { winner: "Boston Celtics", games: 6 };
    const b = buildBracket([
      makeSeries("done", "CF", "Boston Celtics", "Miami Heat", 0, result),
    ]);
    expect(b.CF.east[0].result).toEqual(result);
  });

  it("silently skips series whose teams aren't in TEAM_META", () => {
    const b = buildBracket([
      makeSeries("bogus", "R1", "Fictional Team", "Imaginary Squad", 0),
    ]);
    expect(b.R1.east).toHaveLength(0);
    expect(b.R1.west).toHaveLength(0);
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
      // R2
      makeSeries("r2e1", "R2", "Boston Celtics", "Cleveland Cavaliers", 8),
      // CF
      makeSeries("cfw", "CF", "Denver Nuggets", "Minnesota Timberwolves", 9),
      // Finals
      makeSeries("finals", "F", "Boston Celtics", "Denver Nuggets", 10),
    ]);
    expect(b.R1.east).toHaveLength(4);
    expect(b.R1.west).toHaveLength(4);
    expect(b.R2.east).toHaveLength(1);
    expect(b.CF.west).toHaveLength(1);
    expect(b.F).toHaveLength(1);
  });
});
