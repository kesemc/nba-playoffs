import { describe, expect, it } from "vitest";
import {
  PRIZE_STRUCTURE,
  computePrizeBreakdown,
  prizeSlotForRank,
} from "../src/lib/prize-pool";

const config = { entryFee: 50, currencySymbol: "₪" };

describe("computePrizeBreakdown", () => {
  it("totals match entry fee × player count", () => {
    const r = computePrizeBreakdown(config, 10);
    expect(r.totalPot).toBe(500);
    expect(r.slots.reduce((s, x) => s + x.amount, 0)).toBe(500);
  });

  it("rounding drift is absorbed by first place, never lost", () => {
    // With 11 players the raw splits (55/25/10/10) give decimals; make sure
    // the rounded sum still equals the total pot.
    const r = computePrizeBreakdown(config, 11);
    expect(r.totalPot).toBe(550);
    expect(r.slots.reduce((s, x) => s + x.amount, 0)).toBe(550);
  });

  it("keeps the prize order intact (1st > 2nd > 3rd > last)", () => {
    const r = computePrizeBreakdown(config, 12);
    const [first, second, third, last] = r.slots.map((s) => s.amount);
    expect(first).toBeGreaterThan(second);
    expect(second).toBeGreaterThan(third);
    expect(third).toBeGreaterThanOrEqual(last); // 10% vs 10% — equal is fine
  });

  it("handles a single player gracefully (winner takes all that's there)", () => {
    const r = computePrizeBreakdown(config, 1);
    expect(r.totalPot).toBe(50);
    expect(r.slots.reduce((s, x) => s + x.amount, 0)).toBe(50);
  });
});

describe("prizeSlotForRank", () => {
  it("resolves top-3 slots correctly", () => {
    expect(prizeSlotForRank(1, 10)?.id).toBe("first");
    expect(prizeSlotForRank(2, 10)?.id).toBe("second");
    expect(prizeSlotForRank(3, 10)?.id).toBe("third");
  });

  it("resolves last place from the bottom", () => {
    expect(prizeSlotForRank(10, 10)?.id).toBe("last");
    expect(prizeSlotForRank(12, 12)?.id).toBe("last");
  });

  it("returns null for mid-pack positions", () => {
    expect(prizeSlotForRank(4, 10)).toBeNull();
    expect(prizeSlotForRank(7, 10)).toBeNull();
  });

  it("avoids double-counting when top-3 overlaps last (tiny fields)", () => {
    // Field of 3: ranks 1/2/3, last would also be rank 3. Top-3 should win.
    expect(prizeSlotForRank(3, 3)?.id).toBe("third");
  });
});

describe("PRIZE_STRUCTURE", () => {
  it("percentages sum to 1.00", () => {
    const sum = PRIZE_STRUCTURE.reduce((s, p) => s + p.pct, 0);
    expect(sum).toBeCloseTo(1, 6);
  });
});
