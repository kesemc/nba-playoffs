import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDateTime, formatRound } from "@/lib/format";
import SeriesForm from "@/components/admin/SeriesForm";
import ResultForm from "@/components/admin/ResultForm";

export const dynamic = "force-dynamic";

export default async function AdminSeriesDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const s = await prisma.series.findUnique({
    where: { id: params.id },
    include: { odds: true, result: true },
  });
  if (!s) notFound();

  // Lay out initial odds in the shape the form expects.
  const find = (team: string, games: number | null) =>
    s.odds.find((o) => o.team === team && o.games === games)?.odds ?? NaN;
  const str = (n: number) => (Number.isNaN(n) ? "" : String(n));

  const initialOdds = {
    winnerA: str(find(s.teamA, null)),
    winnerB: str(find(s.teamB, null)),
    a4: str(find(s.teamA, 4)),
    a5: str(find(s.teamA, 5)),
    a6: str(find(s.teamA, 6)),
    a7: str(find(s.teamA, 7)),
    b4: str(find(s.teamB, 4)),
    b5: str(find(s.teamB, 5)),
    b6: str(find(s.teamB, 6)),
    b7: str(find(s.teamB, 7)),
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 space-y-10">
      <div>
        <Link href="/admin/series" className="text-xs text-neutral-500 hover:underline">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {s.teamA} vs {s.teamB}
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          {formatRound(s.round)} · locks {formatDateTime(s.lockTime)}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Odds</h2>
        <SeriesForm
          mode="edit-odds"
          seriesId={s.id}
          teamA={s.teamA}
          teamB={s.teamB}
          round={s.round}
          lockTime={s.lockTime.toISOString()}
          initialOdds={initialOdds}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Result</h2>
        <ResultForm
          seriesId={s.id}
          teamA={s.teamA}
          teamB={s.teamB}
          initial={
            s.result ? { winner: s.result.winner, games: s.result.games } : null
          }
        />
      </section>
    </main>
  );
}
