import { describe, expect, it } from "vitest";
import { EXACT_GAMES_BONUS, scorePick, type OddsRow } from "../src/lib/scoring";

// Only winner-only odds are consulted by the active scoring rule.
//   Team A: win-series 1.5
//   Team B: win-series 3.6
// Exact-games rows may exist (legacy data) but must be ignored by scoring.
const odds: OddsRow[] = [
  { team: "A", games: null, odds: 1.5 },
  { team: "B", games: null, odds: 3.6 },
  // Legacy rows — should not influence payout:
  { team: "A", games: 6, odds: 5.7 },
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

  it("awards winner odds + flat bonus when team and games both match", () => {
    expect(
      scorePick({ team: "A", games: 6 }, { winner: "A", games: 6 }, odds),
    ).toBe(1.5 + EXACT_GAMES_BONUS);
    expect(
      scorePick({ team: "B", games: 7 }, { winner: "B", games: 7 }, odds),
    ).toBe(3.6 + EXACT_GAMES_BONUS);
  });

  it("ignores legacy exact-games odds rows for the payout", () => {
    // A-in-6 has 5.7 in the odds array above. Under the new rule, hitting A
    // in 6 should yield 1.5 + bonus, NOT 5.7.
    const r = { winner: "A", games: 6 };
    expect(scorePick({ team: "A", games: 6 }, r, odds)).toBe(
      1.5 + EXACT_GAMES_BONUS,
    );
  });

  it("example from the product spec: A-winner/B-picker scenario", () => {
    // Scenario: A vs B, A has 1.5, B has 3.6, A wins 4-2 (so games=6).
    //   Pick B, any games -> 0
    //   Pick A, wrong games -> 1.5
    //   Pick A, games=6 -> 1.5 + bonus
    const r = { winner: "A", games: 6 };
    expect(scorePick({ team: "B", games: 6 }, r, odds)).toBe(0);
    expect(scorePick({ team: "A", games: 7 }, r, odds)).toBe(1.5);
    expect(scorePick({ team: "A", games: 6 }, r, odds)).toBe(
      1.5 + EXACT_GAMES_BONUS,
    );
  });

  it("returns 0 when picked team wins but no winner-only odds exist", () => {
    // No rows for the winning team at all -> base is 0, bonus still applies
    // on exact match (3), but the pick doesn't exist in the grid.
    expect(
      scorePick({ team: "A", games: 6 }, { winner: "A", games: 6 }, []),
    ).toBe(EXACT_GAMES_BONUS);
    // A team picks with no matching odds at all produces only the bonus
    // if exact, and 0 if not. This is a degenerate state but documented.
    expect(
      scorePick({ team: "A", games: 5 }, { winner: "A", games: 6 }, []),
    ).toBe(0);
  });

  it("exposes EXACT_GAMES_BONUS as a constant for callers to reference", () => {
    expect(typeof EXACT_GAMES_BONUS).toBe("number");
    expect(EXACT_GAMES_BONUS).toBeGreaterThan(0);
  });
});
