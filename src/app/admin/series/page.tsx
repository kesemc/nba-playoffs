import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDateTime, formatRound } from "@/lib/format";
import DeleteSeriesButton from "@/components/admin/DeleteSeriesButton";

export const dynamic = "force-dynamic";

export default async function AdminSeriesListPage() {
  const rows = await prisma.series.findMany({
    orderBy: [{ lockTime: "asc" }],
    include: { result: true, _count: { select: { picks: true } } },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Series</h1>
        <Link
          href="/admin/series/new"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          + New series
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No series yet. Create one to get the pool started.
        </p>
      ) : (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left">Round</th>
                <th className="px-2 py-2 text-left">Matchup</th>
                <th className="px-2 py-2 text-left">Lock time</th>
                <th className="px-2 py-2 text-left">Picks</th>
                <th className="px-2 py-2 text-left">Result</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2">{formatRound(s.round)}</td>
                  <td className="px-2 py-2 font-medium">
                    {s.teamA} vs {s.teamB}
                  </td>
                  <td className="px-2 py-2">{formatDateTime(s.lockTime)}</td>
                  <td className="px-2 py-2 tabular-nums">{s._count.picks}</td>
                  <td className="px-2 py-2">
                    {s.result ? `${s.result.winner} in ${s.result.games}` : "—"}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/series/${s.id}`}
                        className="text-xs font-medium underline underline-offset-2"
                      >
                        Edit
                      </Link>
                      <DeleteSeriesButton
                        seriesId={s.id}
                        label="Delete"
                        matchup={`${s.teamA} vs ${s.teamB}`}
                        pickCount={s._count.picks}
                        hasResult={Boolean(s.result)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
