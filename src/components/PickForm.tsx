"use client";

import { useState, useTransition } from "react";
import { submitPick, type PickActionResult } from "@/actions/picks";
import { VALID_GAMES } from "@/lib/teams";
import { formatOdds } from "@/lib/format";
import { EXACT_GAMES_BONUS, type OddsRow } from "@/lib/scoring";

type Props = {
  seriesId: string;
  teamA: string;
  teamB: string;
  odds: OddsRow[];
  initialPick: { pickedTeam: string; pickedGames: number } | null;
  disabled?: boolean;
};

function oddsFor(
  odds: OddsRow[],
  team: string,
  games: number | null,
): number | null {
  const row = odds.find((o) => o.team === team && o.games === games);
  return row?.odds ?? null;
}

export default function PickForm({
  seriesId,
  teamA,
  teamB,
  odds,
  initialPick,
  disabled = false,
}: Props) {
  const [team, setTeam] = useState<string>(initialPick?.pickedTeam ?? "");
  const [games, setGames] = useState<number | null>(
    initialPick?.pickedGames ?? null,
  );
  const [result, setResult] = useState<PickActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const winnerOnlyOdds = team ? oddsFor(odds, team, null) : null;
  const exactPayout =
    winnerOnlyOdds !== null ? winnerOnlyOdds + EXACT_GAMES_BONUS : null;

  const canSubmit = Boolean(team) && games !== null && !disabled;

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const r = await submitPick(formData);
      setResult(r);
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="seriesId" value={seriesId} />

      <fieldset disabled={disabled}>
        <legend className="text-sm font-medium">Team to win</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[teamA, teamB].map((t) => {
            const o = oddsFor(odds, t, null);
            const selected = team === t;
            return (
              <label
                key={t}
                className={`cursor-pointer rounded-md border p-3 text-sm transition-colors ${
                  selected
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                }`}
              >
                <input
                  type="radio"
                  name="pickedTeam"
                  value={t}
                  checked={selected}
                  onChange={() => setTeam(t)}
                  className="sr-only"
                />
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t}</span>
                  <span
                    className={`text-xs ${
                      selected
                        ? "opacity-80"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {o !== null ? `× ${formatOdds(o)}` : "—"}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset disabled={disabled || !team}>
        <legend className="text-sm font-medium">In how many games?</legend>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {VALID_GAMES.map((g) => {
            const selected = games === g;
            return (
              <label
                key={g}
                className={`cursor-pointer rounded-md border p-3 text-center text-sm transition-colors ${
                  selected
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                } ${!team ? "opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name="pickedGames"
                  value={g}
                  checked={selected}
                  onChange={() => setGames(g)}
                  className="sr-only"
                />
                <div className="font-medium">in {g}</div>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-md bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
        <div className="flex items-center justify-between">
          <span>Right team, any games</span>
          <b className="tabular-nums">
            {winnerOnlyOdds !== null ? formatOdds(winnerOnlyOdds) : "—"}
          </b>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span>Right team + exact games (+{EXACT_GAMES_BONUS} bonus)</span>
          <b className="tabular-nums">
            {exactPayout !== null ? formatOdds(exactPayout) : "—"}
          </b>
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit || pending}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {pending
          ? "Saving..."
          : initialPick
            ? "Update pick"
            : "Submit pick"}
      </button>

      {result && !result.ok ? (
        <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
      ) : null}
      {result && result.ok ? (
        <p className="text-sm text-green-700 dark:text-green-400">
          Pick saved.
        </p>
      ) : null}
    </form>
  );
}
