"use client";

import useSWR from "swr";
import { formatPoints } from "@/lib/format";
import {
  formatCurrency,
  prizeSlotForRank,
  type PrizeBreakdown,
} from "@/lib/prize-pool";

type Row = { userId: string; displayName: string; points: number };
type Payload = { rows: Row[]; computedAt: string };

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r.json() as Promise<Payload>;
  });

export default function LeaderboardTable({
  initialData,
  pool,
}: {
  initialData: Payload;
  pool: PrizeBreakdown | null;
}) {
  const { data, error, isValidating } = useSWR<Payload>(
    "/api/leaderboard",
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: 15_000, // live scoreboard — ~15s polling
      revalidateOnFocus: true,
      keepPreviousData: true,
    },
  );

  const rows = data?.rows ?? [];
  const showPrize = Boolean(pool);
  // Prizes are distributed across the explicit pool size (e.g. "last place"
  // means the last of the paid entrants, not just the last of people with
  // recorded points). Fall back to visible field size if the pool is larger
  // than the displayed rows (shouldn't normally happen — computeLeaderboard
  // returns a row per user).
  const fieldSize = pool
    ? Math.max(pool.playerCount, rows.length)
    : rows.length;

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium dark:border-neutral-800 dark:bg-neutral-900">
        <span>Standings</span>
        <span className="text-xs font-normal text-neutral-500">
          {isValidating ? "Refreshing…" : error ? "Connection issue" : "Live"}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-neutral-500">
          No scores yet — standings appear here once the first series ends.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="w-12 px-4 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">User</th>
              <th className="px-2 py-2 text-right">Points</th>
              {showPrize ? (
                <th className="w-24 px-2 py-2 text-right">Prize</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((r, i) => {
              const rank = i + 1;
              const slot = pool
                ? prizeSlotForRank(rank, fieldSize)
                : null;
              const amount = slot
                ? pool!.slots.find((s) => s.id === slot.id)?.amount ?? 0
                : 0;
              const highlight = slot
                ? {
                    first: "bg-amber-50/70 dark:bg-amber-950/20",
                    second: "bg-neutral-50 dark:bg-neutral-900/40",
                    third: "bg-neutral-50 dark:bg-neutral-900/40",
                    last: "bg-rose-50/50 dark:bg-rose-950/20",
                  }[slot.id]
                : "";
              return (
                <tr key={r.userId} className={highlight}>
                  <td className="px-4 py-2 tabular-nums text-neutral-500">
                    {rank}
                  </td>
                  <td className="px-2 py-2 font-medium">{r.displayName}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatPoints(r.points)}
                  </td>
                  {showPrize ? (
                    <td
                      className="px-2 py-2 text-right tabular-nums text-xs"
                      title={slot?.label ?? ""}
                    >
                      {slot ? (
                        <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                          {formatCurrency(amount, pool!.currencySymbol)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {showPrize ? (
        <p className="border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800">
          Projected payouts if the tournament ended right now. Pool:{" "}
          <b className="text-neutral-700 dark:text-neutral-300">
            {formatCurrency(pool!.totalPot, pool!.currencySymbol)}
          </b>{" "}
          · Red Lantern goes to the last-place finisher.
        </p>
      ) : null}
    </div>
  );
}
