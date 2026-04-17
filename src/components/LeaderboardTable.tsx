"use client";

import useSWR from "swr";
import { formatPoints } from "@/lib/format";

type Row = { userId: string; displayName: string; points: number };
type Payload = { rows: Row[]; computedAt: string };

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r.json() as Promise<Payload>;
  });

export default function LeaderboardTable({
  initialData,
}: {
  initialData: Payload;
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
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((r, i) => (
              <tr key={r.userId}>
                <td className="px-4 py-2 text-neutral-500 tabular-nums">
                  {i + 1}
                </td>
                <td className="px-2 py-2 font-medium">{r.displayName}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatPoints(r.points)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
