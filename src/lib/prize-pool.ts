/**
 * Prize-pool configuration and derivations.
 *
 * The pool is a real-world transaction (cash handled outside the app), so
 * this module is purely display logic: it takes the entry fee + player count
 * and produces a breakdown to show on the dashboard / leaderboard.
 *
 * Config via env vars (all optional — if missing, no pool UI is rendered):
 *   POOL_ENTRY_FEE        numeric, e.g. "50"
 *   POOL_CURRENCY_SYMBOL  string,  e.g. "₪" / "$" / "€"
 *
 * Prize structure:
 *   - Last place is refunded their entry fee (a gentle consolation — they
 *     came in last, but they don't lose real money).
 *   - The remaining pot (`totalPot − entryFee`) is split between 1st/2nd/3rd
 *     using a fixed 55:25:10 weight ratio.
 */
export type PrizeSlot = {
  /** Stable id used for rendering/UI keys. */
  id: "first" | "second" | "third" | "last";
  /** 1-based rank from the TOP for "top" slots, from the BOTTOM for "last". */
  rankFromTop?: 1 | 2 | 3;
  rankFromBottom?: 1;
  label: string;
  /**
   * How this slot's amount is determined:
   *   - "topShare":       gets `topShare` units of the (pot − entryFee) pool
   *   - "entryFeeRefund": gets exactly one entry fee back (capped at totalPot)
   */
  kind: "topShare" | "entryFeeRefund";
  /** Present for topShare slots only; raw weights — normalized in compute. */
  topShare?: number;
};

export const PRIZE_STRUCTURE: PrizeSlot[] = [
  { id: "first",  rankFromTop: 1,    label: "1st place",  kind: "topShare",       topShare: 0.55 },
  { id: "second", rankFromTop: 2,    label: "2nd place",  kind: "topShare",       topShare: 0.25 },
  { id: "third",  rankFromTop: 3,    label: "3rd place",  kind: "topShare",       topShare: 0.10 },
  { id: "last",   rankFromBottom: 1, label: "Last place", kind: "entryFeeRefund" },
];

// Basic sanity: top-share weights must be positive. They don't need to sum
// to any particular value — we renormalize inside computePrizeBreakdown.
const TOP_SHARE_SUM = PRIZE_STRUCTURE.filter((s) => s.kind === "topShare")
  .reduce((a, s) => a + (s.topShare ?? 0), 0);
if (TOP_SHARE_SUM <= 0) {
  throw new Error("PRIZE_STRUCTURE has no positive top-share weights");
}

export type PoolConfig = {
  entryFee: number;
  currencySymbol: string;
};

/**
 * Read pool config from the process env. Returns null if the entry fee is
 * missing or not a positive number — callers should gracefully hide the UI.
 *
 * We intentionally do NOT pull secrets here; entry fee + currency are
 * product config, safe to surface in the response body.
 */
export function readPoolConfig(): PoolConfig | null {
  const raw = process.env.POOL_ENTRY_FEE?.trim();
  if (!raw) return null;
  const entryFee = Number(raw);
  if (!Number.isFinite(entryFee) || entryFee <= 0) return null;
  const currencySymbol = process.env.POOL_CURRENCY_SYMBOL?.trim() || "₪";
  return { entryFee, currencySymbol };
}

export type PrizeBreakdown = {
  entryFee: number;
  currencySymbol: string;
  playerCount: number;
  totalPot: number;
  slots: {
    id: PrizeSlot["id"];
    label: string;
    pct: number;
    amount: number;
    rankFromTop?: number;
    rankFromBottom?: number;
  }[];
};

/**
 * Compute the full prize breakdown given a config + player count.
 *
 * Algorithm:
 *   1. Last place = min(entryFee, totalPot). (Cap so tiny pools can't pay
 *      out more than they hold.)
 *   2. Remaining = totalPot − lastAmount.
 *   3. Each top-share slot gets `remaining × (topShare / TOP_SHARE_SUM)`.
 *   4. Round to whole currency units (friends settle via Bit/PayBox and
 *      half-shekel prizes are bad UX), then absorb the rounding drift into
 *      the 1st-place prize so the sum still equals the exact pot.
 */
export function computePrizeBreakdown(
  config: PoolConfig,
  playerCount: number,
): PrizeBreakdown {
  const totalPot = config.entryFee * playerCount;
  const lastAmount = Math.min(config.entryFee, totalPot);
  const remaining = Math.max(0, totalPot - lastAmount);

  const rawAmounts = PRIZE_STRUCTURE.map((s) => {
    if (s.kind === "entryFeeRefund") return lastAmount;
    return remaining * ((s.topShare ?? 0) / TOP_SHARE_SUM);
  });
  const rounded = rawAmounts.map((a) => Math.round(a));
  // Fix rounding drift against the first-place prize.
  const drift = totalPot - rounded.reduce((a, b) => a + b, 0);
  rounded[0] = rounded[0] + drift;

  return {
    entryFee: config.entryFee,
    currencySymbol: config.currencySymbol,
    playerCount,
    totalPot,
    slots: PRIZE_STRUCTURE.map((s, i) => ({
      id: s.id,
      label: s.label,
      // Display as actual share of the total pot (dynamic — with a fixed
      // last-place refund, the percentages shift as pot size changes).
      pct: totalPot > 0 ? rounded[i] / totalPot : 0,
      amount: rounded[i],
      rankFromTop: s.rankFromTop,
      rankFromBottom: s.rankFromBottom,
    })),
  };
}

/**
 * Returns the prize slot a player at the given 1-based rank would win, or
 * null if they're out of the money.
 *
 * Requires the total field size to know what "last" means.
 */
export function prizeSlotForRank(
  rank: number,
  fieldSize: number,
): PrizeSlot | null {
  for (const slot of PRIZE_STRUCTURE) {
    if (slot.rankFromTop && rank === slot.rankFromTop) return slot;
    if (slot.rankFromBottom && rank === fieldSize - slot.rankFromBottom + 1) {
      return slot;
    }
  }
  return null;
}

/** Format a currency amount for display. */
export function formatCurrency(amount: number, symbol: string): string {
  const body = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return `${symbol}${body}`;
}
