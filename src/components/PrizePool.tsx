import { prisma } from "@/lib/db";
import {
  computePrizeBreakdown,
  formatCurrency,
  readPoolConfig,
} from "@/lib/prize-pool";

/**
 * Dashboard strip showing the current prize pool + payout breakdown.
 *
 * Renders nothing (returns null) when POOL_ENTRY_FEE is not configured,
 * so non-pool installs aren't affected.
 *
 * Player count priority:
 *   1. Explicit POOL_PLAYER_COUNT env var (admin-set, authoritative)
 *   2. Number of registered users in the DB (fallback for convenience)
 */
export default async function PrizePool() {
  const config = readPoolConfig();
  if (!config) return null;

  const envCountRaw = process.env.POOL_PLAYER_COUNT?.trim();
  const envCount = envCountRaw ? Number(envCountRaw) : NaN;

  const playerCount =
    Number.isFinite(envCount) && envCount > 0
      ? Math.floor(envCount)
      : await prisma.user.count();

  if (playerCount <= 0) return null;

  const breakdown = computePrizeBreakdown(config, playerCount);

  const money = (n: number) => formatCurrency(n, breakdown.currencySymbol);

  return (
    <section
      aria-label="Prize pool"
      className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Prize pool
          </h2>
          <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
            {playerCount} {playerCount === 1 ? "entrant" : "entrants"} ×{" "}
            {money(breakdown.entryFee)}
          </p>
        </div>
        <div className="text-2xl font-bold tabular-nums text-amber-900 dark:text-amber-100">
          {money(breakdown.totalPot)}
        </div>
      </div>

      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {breakdown.slots.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2 text-neutral-800 shadow-sm dark:bg-neutral-900/70 dark:text-neutral-200"
          >
            <span className="font-medium">
              {s.label}
              <span className="ml-1 text-xs font-normal text-neutral-500">
                ({Math.round(s.pct * 100)}%)
              </span>
            </span>
            <span className="tabular-nums font-semibold">{money(s.amount)}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-amber-900/70 dark:text-amber-200/70">
        Cash is handled between players — the app just keeps score. Payouts
        happen after the Finals.
      </p>
    </section>
  );
}
