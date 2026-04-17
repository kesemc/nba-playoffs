"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NBA_TEAMS, ROUNDS, ROUND_LABELS } from "@/lib/teams";
import { createSeries, updateSeriesOdds } from "@/actions/series";
import {
  formatIsraelDateTime,
  israelWallclockToUtc,
  utcToIsraelWallclock,
} from "@/lib/tz";

type OddsValues = {
  winnerA: string;
  winnerB: string;
  a4: string;
  a5: string;
  a6: string;
  a7: string;
  b4: string;
  b5: string;
  b6: string;
  b7: string;
};

const EMPTY_ODDS: OddsValues = {
  winnerA: "", winnerB: "",
  a4: "", a5: "", a6: "", a7: "",
  b4: "", b5: "", b6: "", b7: "",
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
      try {
        fd.set("lockTime", israelWallclockToUtc(lockTime).toISOString());
      } catch {
        setError("Please pick a valid lock date and time.");
        return;
      }
    }
    if (isEdit) {
      fd.set("seriesId", props.seriesId);
    }

    startTransition(async () => {
      const res = isEdit
        ? await updateSeriesOdds(fd)
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
            </span>
          </label>
        </>
      ) : (
        <div className="rounded-md bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-900">
          Editing odds for <b>{props.teamA}</b> vs <b>{props.teamB}</b> · locks{" "}
          {formatIsraelDateTime(new Date(props.lockTime))}
        </div>
      )}

      {/* Odds grid */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium dark:border-neutral-800 dark:bg-neutral-900">
          Odds (from bet365)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left">Team</th>
                <th className="px-2 py-2 text-right">Win series</th>
                <th className="px-2 py-2 text-right">in 4</th>
                <th className="px-2 py-2 text-right">in 5</th>
                <th className="px-2 py-2 text-right">in 6</th>
                <th className="px-2 py-2 text-right">in 7</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              <tr>
                <td className="px-4 py-2 font-medium">
                  {isEdit ? props.teamA : teamA || "Team A"}
                </td>
                {(["winnerA", "a4", "a5", "a6", "a7"] as const).map((k) => (
                  <td key={k} className="px-2 py-2">
                    <input
                      inputMode="decimal"
                      step="0.01"
                      type="number"
                      value={odds[k]}
                      onChange={(e) => setOdd(k, e.target.value)}
                      className="w-20 rounded border border-neutral-300 bg-white px-2 py-1 text-right tabular-nums dark:border-neutral-700 dark:bg-neutral-900"
                      required
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">
                  {isEdit ? props.teamB : teamB || "Team B"}
                </td>
                {(["winnerB", "b4", "b5", "b6", "b7"] as const).map((k) => (
                  <td key={k} className="px-2 py-2">
                    <input
                      inputMode="decimal"
                      step="0.01"
                      type="number"
                      value={odds[k]}
                      onChange={(e) => setOdd(k, e.target.value)}
                      className="w-20 rounded border border-neutral-300 bg-white px-2 py-1 text-right tabular-nums dark:border-neutral-700 dark:bg-neutral-900"
                      required
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-xs text-neutral-500">
          All values must be greater than 1.00 (decimal odds).
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
            ? "Save odds"
            : "Create series"}
      </button>
    </form>
  );
}

