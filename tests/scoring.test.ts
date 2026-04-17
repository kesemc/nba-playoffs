import { describe, expect, it } from "vitest";
import { scorePick, type OddsRow } from "../src/lib/scoring";

// A typical bet365-style grid for "Team A vs Team B":
//                 win series   in 4    in 5    in 6    in 7
//   Team A         1.50        5.70    4.20    5.70    8.50
//   Team B         3.60        21.0    15.0    12.0    18.0
const odds: OddsRow[] = [
  { team: "A", games: null, odds: 1.5 },
  { team: "A", games: 4, odds: 5.7 },
  { team: "A", games: 5, odds: 4.2 },
  { team: "A", games: 6, odds: 5.7 },
  { team: "A", games: 7, odds: 8.5 },
  { team: "B", games: null, odds: 3.6 },
  { team: "B", games: 4, odds: 21.0 },
  { team: "B", games: 5, odds: 15.0 },
  { team: "B", games: 6, odds: 12.0 },
  { team: "B", games: 7, odds: 18.0 },
];

describe("scorePick", () => {
  it("gives 0 when picked team does not win", () => {
    expect(
      scorePick({ team: "B", games: 4 }, { winner: "A", games: 6 }, odds),
    ).toBe(0);
    expect(
      scorePick({ team: "B", games: 7 }, { winner: "A", games: 6 }, odds),
    ).toBe(0);
  });

  it("awards winner-only odds when team is right but games are wrong", () => {
    expect(
      scorePick({ team: "A", games: 4 }, { winner: "A", games: 6 }, odds),
    ).toBe(1.5);
    expect(
      scorePick({ team: "A", games: 7 }, { winner: "A", games: 6 }, odds),
    ).toBe(1.5);
    expect(
      scorePick({ team: "B", games: 4 }, { winner: "B", games: 7 }, odds),
    ).toBe(3.6);
  });

  it("awards exact-score odds when team and games both match", () => {
    expect(
      scorePick({ team: "A", games: 6 }, { winner: "A", games: 6 }, odds),
    ).toBe(5.7);
    expect(
      scorePick({ team: "B", games: 7 }, { winner: "B", games: 7 }, odds),
    ).toBe(18.0);
  });

  it("example from the product spec: A-winner/B-picker", () => {
    // Scenario: "A vs B, A has 1.5, B has 3.6, A-in-6 is 5.7, A wins 4-2 (so games=6)."
    // Pick B, any games -> 0
    // Pick A, wrong games -> 1.5
    // Pick A, games=6 -> 5.7
    const r = { winner: "A", games: 6 };
    expect(scorePick({ team: "B", games: 6 }, r, odds)).toBe(0);
    expect(scorePick({ team: "A", games: 7 }, r, odds)).toBe(1.5);
    expect(scorePick({ team: "A", games: 6 }, r, odds)).toBe(5.7);
  });

  it("falls back to winner-only odds if exact-score row is missing", () => {
    const thinOdds: OddsRow[] = [
      { team: "A", games: null, odds: 1.5 },
      // no A/in-6 row
    ];
    expect(
      scorePick({ team: "A", games: 6 }, { winner: "A", games: 6 }, thinOdds),
    ).toBe(1.5);
  });

  it("returns 0 when picked team wins but there are no odds at all", () => {
    expect(
      scorePick({ team: "A", games: 6 }, { winner: "A", games: 6 }, []),
    ).toBe(0);
  });
});
