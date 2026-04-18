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

  it("last place is exactly the entry fee", () => {
    const r = computePrizeBreakdown(config, 10);
    const last = r.slots.find((s) => s.id === "last")!;
    expect(last.amount).toBe(config.entryFee);
  });

  it("rounding drift is absorbed by first place, never lost", () => {
    // With 11 players the top-3 shares of (pot − entryFee) give decimals;
    // make sure the rounded sum still equals the total pot.
    const r = computePrizeBreakdown(config, 11);
    expect(r.totalPot).toBe(550);
    expect(r.slots.reduce((s, x) => s + x.amount, 0)).toBe(550);
  });

  it("keeps the prize order intact among the top 3 (1st > 2nd > 3rd)", () => {
    const r = computePrizeBreakdown(config, 12);
    const [first, second, third] = r.slots
      .filter((s) => s.id !== "last")
      .map((s) => s.amount);
    expect(first).toBeGreaterThan(second);
    expect(second).toBeGreaterThan(third);
  });

  it("top 3 split the pot _after_ the last-place refund in 55:25:10 ratio", () => {
    // 12 × 50 = 600 pot. Last gets 50. Remaining 550 splits:
    //   1st = 550 × (0.55/0.90) = 336.11 → 336 (+drift)
    //   2nd = 550 × (0.25/0.90) = 152.78 → 153
    //   3rd = 550 × (0.10/0.90) =  61.11 →  61
    //   last = 50
    // sum = 336 + 153 + 61 + 50 = 600 ✓
    const r = computePrizeBreakdown(config, 12);
    const amounts = Object.fromEntries(r.slots.map((s) => [s.id, s.amount]));
    expect(amounts.first).toBe(336);
    expect(amounts.second).toBe(153);
    expect(amounts.third).toBe(61);
    expect(amounts.last).toBe(50);
  });

  it("handles a single player gracefully (last-place cap kicks in)", () => {
    const r = computePrizeBreakdown(config, 1);
    expect(r.totalPot).toBe(50);
    // With 1 player, totalPot === entryFee, so last=50 and the top 3 each
    // get 0. Total still sums to the pot.
    expect(r.slots.reduce((s, x) => s + x.amount, 0)).toBe(50);
    const last = r.slots.find((s) => s.id === "last")!;
    expect(last.amount).toBe(50);
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
  it("has a single entry-fee refund slot (last place)", () => {
    const refundSlots = PRIZE_STRUCTURE.filter((s) => s.kind === "entryFeeRefund");
    expect(refundSlots).toHaveLength(1);
    expect(refundSlots[0]?.id).toBe("last");
    expect(refundSlots[0]?.label).toBe("Last place");
  });

  it("has positive top-share weights for 1st/2nd/3rd", () => {
    const top = PRIZE_STRUCTURE.filter((s) => s.kind === "topShare");
    expect(top).toHaveLength(3);
    for (const s of top) expect(s.topShare).toBeGreaterThan(0);
  });
});
