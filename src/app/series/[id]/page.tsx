import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { getSeriesDetail } from "@/lib/series-queries";
import {
  formatDateTime,
  formatOdds,
  formatPoints,
  formatRound,
} from "@/lib/format";
import Countdown from "@/components/Countdown";
import PickForm from "@/components/PickForm";
import { VALID_GAMES } from "@/lib/teams";

export default async function SeriesPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const s = await getSeriesDetail(params.id, user.id);
  if (!s) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div>
        <Link href="/" className="text-xs text-neutral-500 hover:underline">
          ← Back to dashboard
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            {s.teamA} vs {s.teamB}
          </h1>
          <span className="text-xs uppercase tracking-wide text-neutral-500">
            {formatRound(s.round)}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Tipoff {formatDateTime(s.lockTime)} ·{" "}
          {s.isLocked ? (
            <span className="text-red-600 dark:text-red-400 font-medium">
              Picks locked
            </span>
          ) : (
            <>
              Locks in <Countdown lockTime={s.lockTime.toISOString()} />
            </>
          )}
        </p>
      </div>

      {/* Odds grid reference */}
      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium dark:border-neutral-800 dark:bg-neutral-900">
          Odds
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left">Team</th>
                <th className="px-2 py-2 text-right">Win series</th>
                {VALID_GAMES.map((g) => (
                  <th key={g} className="px-2 py-2 text-right">
                    in {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {[s.teamA, s.teamB].map((team) => (
                <tr key={team}>
                  <td className="px-4 py-2 font-medium">{team}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatOdds(
                      s.odds.find((o) => o.team === team && o.games === null)
                        ?.odds ?? NaN,
                    )}
                  </td>
                  {VALID_GAMES.map((g) => (
                    <td key={g} className="px-2 py-2 text-right tabular-nums">
                      {formatOdds(
                        s.odds.find((o) => o.team === team && o.games === g)
                          ?.odds ?? NaN,
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Result (if any) */}
      {s.result ? (
        <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="text-sm font-medium">Final result</div>
          <div className="mt-1 text-2xl font-semibold">
            {s.result.winner} in {s.result.games}
          </div>
        </section>
      ) : null}

      {/* Pick form (pre-lock) OR user's locked pick recap */}
      {!s.isLocked ? (
        <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-sm font-medium">Your pick</h2>
          <div className="mt-3">
            <PickForm
              seriesId={s.id}
              teamA={s.teamA}
              teamB={s.teamB}
              odds={s.odds}
              initialPick={s.myPick}
            />
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-sm font-medium">Your pick</h2>
          {s.myPick ? (
            <p className="mt-1 text-lg font-semibold">
              {s.myPick.pickedTeam} in {s.myPick.pickedGames}
            </p>
          ) : (
            <p className="mt-1 text-sm text-neutral-500">You didn&apos;t submit a pick.</p>
          )}
        </section>
      )}

      {/* Everyone's picks (only visible after lock) */}
      {s.isLocked ? (
        <section className="rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium dark:border-neutral-800 dark:bg-neutral-900">
            All picks
          </div>
          {s.allPicks.length === 0 ? (
            <p className="px-4 py-6 text-sm text-neutral-500">
              Nobody submitted a pick for this series.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-2 py-2 text-left">Pick</th>
                  <th className="px-2 py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {s.allPicks
                  .slice()
                  .sort((a, b) => (b.points ?? -1) - (a.points ?? -1))
                  .map((p) => (
                    <tr key={p.userId}>
                      <td className="px-4 py-2">{p.displayName}</td>
                      <td className="px-2 py-2">
                        {p.pickedTeam} in {p.pickedGames}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {formatPoints(p.points)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
    </main>
  );
}
