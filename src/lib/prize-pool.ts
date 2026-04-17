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
 */
export type PrizeSlot = {
  /** Stable id used for rendering/UI keys. */
  id: "first" | "second" | "third" | "last";
  /** 1-based rank from the TOP for "top" slots, from the BOTTOM for "last". */
  rankFromTop?: 1 | 2 | 3;
  rankFromBottom?: 1;
  label: string;
  pct: number;
};

export const PRIZE_STRUCTURE: PrizeSlot[] = [
  { id: "first",  rankFromTop: 1,    label: "1st place",          pct: 0.55 },
  { id: "second", rankFromTop: 2,    label: "2nd place",          pct: 0.25 },
  { id: "third",  rankFromTop: 3,    label: "3rd place",          pct: 0.10 },
  { id: "last",   rankFromBottom: 1, label: "Red Lantern (last)", pct: 0.10 },
];

// Basic sanity: percentages must sum to 1 (within float tolerance).
if (Math.abs(PRIZE_STRUCTURE.reduce((s, p) => s + p.pct, 0) - 1) > 1e-6) {
  throw new Error(
    `PRIZE_STRUCTURE percentages must sum to 1.00, got ${PRIZE_STRUCTURE
      .reduce((s, p) => s + p.pct, 0)
      .toFixed(4)}`,
  );
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
 * Why round to whole currency units? The pot is handled in real life as
 * Bit/PayBox transfers between friends; displaying ₪54.5 for someone's prize
 * is worse UX than rounding. We round with banker's rounding to the nearest
 * whole unit, then adjust the 1st-place prize so the sum still equals the
 * exact pot — no mysteriously-disappearing shekels.
 */
export function computePrizeBreakdown(
  config: PoolConfig,
  playerCount: number,
): PrizeBreakdown {
  const totalPot = config.entryFee * playerCount;

  const rawAmounts = PRIZE_STRUCTURE.map((s) => totalPot * s.pct);
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
      pct: s.pct,
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
