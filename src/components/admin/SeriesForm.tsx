"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NBA_TEAMS, ROUNDS, ROUND_LABELS } from "@/lib/teams";
import { createSeries, updateSeries } from "@/actions/series";
import {
  formatIsraelDateTime,
  israelWallclockToUtc,
  utcToIsraelWallclock,
} from "@/lib/tz";

type OddsValues = {
  winnerA: string;
  winnerB: string;
};

const EMPTY_ODDS: OddsValues = {
  winnerA: "",
  winnerB: "",
};

type Props =
  | {
      mode: "create";
    }
  | {
      mode: "edit-odds";
      seriesId: string;
      teamA: string;
      teamB: string;
      round: string;
      lockTime: string; // ISO
      initialOdds: OddsValues;
    };

export default function SeriesForm(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === "edit-odds";

  const [round, setRound] = useState<string>(isEdit ? props.round : "R1");
  const [teamA, setTeamA] = useState<string>(isEdit ? props.teamA : "");
  const [teamB, setTeamB] = useState<string>(isEdit ? props.teamB : "");
  const [lockTime, setLockTime] = useState<string>(
    isEdit ? utcToIsraelWallclock(new Date(props.lockTime)) : "",
  );
  const [odds, setOdds] = useState<OddsValues>(
    isEdit ? props.initialOdds : EMPTY_ODDS,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setOdd(k: keyof OddsValues, v: string) {
    setOdds((prev) => ({ ...prev, [k]: v }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    // Inject managed state into the FormData we'll send
    for (const [k, v] of Object.entries(odds)) {
      fd.set(k, v);
    }
    if (!isEdit) {
      fd.set("round", round);
      fd.set("teamA", teamA);
      fd.set("teamB", teamB);
    }
    // Lock time is editable in both modes; convert Israel-wallclock to UTC ISO.
    try {
      fd.set("lockTime", israelWallclockToUtc(lockTime).toISOString());
    } catch {
      setError("Please pick a valid lock date and time.");
      return;
    }
    if (isEdit) {
      fd.set("seriesId", props.seriesId);
    }

    startTransition(async () => {
      const res = isEdit
        ? await updateSeries(fd)
        : await createSeries(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (!isEdit && "data" in res && res.data && "id" in res.data) {
        router.push(`/admin/series/${res.data.id}`);
      } else {
        router.refresh();
      }
    });
  }

  const lockTimeField = (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">
        Lock time (Game 1 tipoff){" "}
        <span className="text-xs font-normal text-neutral-500">
          — Israel time (Asia/Jerusalem)
        </span>
      </span>
      <input
        type="datetime-local"
        value={lockTime}
        onChange={(e) => setLockTime(e.target.value)}
        className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        required
      />
      <span className="mt-1 block text-xs text-neutral-500">
        Enter the hour as you would read it on a clock in Israel.
        {isEdit ? (
          <>
            {" "}
            Originally locked at{" "}
            <b>{formatIsraelDateTime(new Date(props.lockTime))}</b>.
          </>
        ) : null}
      </span>
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {!isEdit ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Round</span>
              <select
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                {ROUNDS.map((r) => (
                  <option key={r} value={r}>
                    {ROUND_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Team A</span>
              <select
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                required
              >
                <option value="" disabled>
                  Choose a team…
                </option>
                {NBA_TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Team B</span>
              <select
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                required
              >
                <option value="" disabled>
                  Choose a team…
                </option>
                {NBA_TEAMS.filter((t) => t !== teamA).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {lockTimeField}
        </>
      ) : (
        <>
          <div className="rounded-md bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-900">
            Editing <b>{props.teamA}</b> vs <b>{props.teamB}</b> ·{" "}
            {ROUND_LABELS[props.round as keyof typeof ROUND_LABELS] ?? props.round}
          </div>
          {lockTimeField}
        </>
      )}

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium dark:border-neutral-800 dark:bg-neutral-900">
          Odds to win series (from bet365)
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {(
            [
              { key: "winnerA", team: isEdit ? props.teamA : teamA || "Team A" },
              { key: "winnerB", team: isEdit ? props.teamB : teamB || "Team B" },
            ] as const
          ).map(({ key, team }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="font-medium">{team}</span>
              <input
                inputMode="decimal"
                step="0.01"
                type="number"
                value={odds[key]}
                onChange={(e) => setOdd(key, e.target.value)}
                className="w-28 rounded border border-neutral-300 bg-white px-2 py-1 text-right tabular-nums dark:border-neutral-700 dark:bg-neutral-900"
                required
                aria-label={`${team} decimal odds to win series`}
              />
            </div>
          ))}
        </div>
        <p className="border-t border-neutral-200 bg-neutral-50/50 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50">
          Decimal odds, must be greater than 1.00. Example: enter <b>1.50</b>{" "}
          for &ldquo;Celtics to win series, 1.50 odds&rdquo;. Pickers receive
          these points for the correct winner, plus a flat <b>+3 bonus</b> if
          they also nail the exact games.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {pending
          ? "Saving…"
          : isEdit
            ? "Save changes"
            : "Create series"}
      </button>
    </form>
  );
}

