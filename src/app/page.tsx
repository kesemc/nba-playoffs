import Link from "next/link";
import { currentUser } from "@/lib/auth-helpers";
import { listSeriesForUser } from "@/lib/series-queries";
import { formatDateTime, formatRound, formatPoints } from "@/lib/format";
import Countdown from "@/components/Countdown";
import PrizePool from "@/components/PrizePool";
import ParticipationSummary from "@/components/ParticipationSummary";
import { scorePick } from "@/lib/scoring";

export default async function HomePage() {
  const user = await currentUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight">NBA Playoffs Pool</h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-300">
          Private series-pick game. Pick winners and exact series scores,
          and rack up points weighted by bet365 odds.
        </p>
        <Link
          href="/sign-in"
          className="mt-10 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const series = await listSeriesForUser(user.id);
  const open = series.filter((s) => !s.isLocked);
  const awaiting = series.filter((s) => s.isLocked && !s.result);
  const completed = series.filter((s) => s.isLocked && s.result);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Welcome back{user.name ? `, ${user.name}` : ""}. Make your picks before tipoff.
        </p>
      </header>

      <PrizePool />

      <section>
        <h2 className="text-lg font-semibold">Pick now</h2>
        {open.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No series currently open for picks.</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {open.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500">
                  <span>{formatRound(s.round)}</span>
                  <span>
                    Locks in <Countdown lockTime={s.lockTime.toISOString()} />
                  </span>
                </div>
                <div className="mt-2 text-base font-semibold">
                  {s.teamA} vs {s.teamB}
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  Tipoff {formatDateTime(s.lockTime)}
                </div>
                <div className="mt-3 text-sm">
                  {s.myPick ? (
                    <span className="text-neutral-700 dark:text-neutral-300">
                      Your pick: <b>{s.myPick.pickedTeam} in {s.myPick.pickedGames}</b>
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      No pick yet
                    </span>
                  )}
                </div>
                {s.participation ? (
                  <div className="mt-2">
                    <ParticipationSummary
                      participation={s.participation}
                      variant="compact"
                    />
                  </div>
                ) : null}
                <Link
                  href={`/series/${s.id}`}
                  className="mt-3 inline-block text-sm font-medium underline underline-offset-2"
                >
                  {s.myPick ? "Edit pick" : "Make pick"} →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Awaiting results</h2>
        {awaiting.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Nothing awaiting results.</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {awaiting.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  {formatRound(s.round)} · Locked
                </div>
                <div className="mt-2 text-base font-semibold">
                  {s.teamA} vs {s.teamB}
                </div>
                <div className="mt-3 text-sm">
                  {s.myPick ? (
                    <span>
                      Your pick: <b>{s.myPick.pickedTeam} in {s.myPick.pickedGames}</b>
                    </span>
                  ) : (
                    <span className="text-neutral-500">You didn&apos;t pick this one.</span>
                  )}
                </div>
                <Link
                  href={`/series/${s.id}`}
                  className="mt-3 inline-block text-sm font-medium underline underline-offset-2"
                >
                  See all picks →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Completed</h2>
        {completed.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No completed series yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {completed.map((s) => {
              const pts =
                s.myPick && s.result
                  ? scorePick(
                      { team: s.myPick.pickedTeam, games: s.myPick.pickedGames },
                      s.result,
                      s.odds,
                    )
                  : null;
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="text-xs uppercase tracking-wide text-neutral-500">
                    {formatRound(s.round)} · Final
                  </div>
                  <div className="mt-2 text-base font-semibold">
                    {s.teamA} vs {s.teamB}
                  </div>
                  <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                    {s.result!.winner} in {s.result!.games}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>
                      Your pick:{" "}
                      {s.myPick ? (
                        <b>{s.myPick.pickedTeam} in {s.myPick.pickedGames}</b>
                      ) : (
                        <span className="text-neutral-500">None</span>
                      )}
                    </span>
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium dark:bg-neutral-800">
                      {formatPoints(pts)} pts
                    </span>
                  </div>
                  <Link
                    href={`/series/${s.id}`}
                    className="mt-3 inline-block text-sm font-medium underline underline-offset-2"
                  >
                    Details →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
