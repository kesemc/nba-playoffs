"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { VALID_GAMES } from "@/lib/teams";
import { clearSeriesResult, enterSeriesResult } from "@/actions/series";

type Props = {
  seriesId: string;
  teamA: string;
  teamB: string;
  initial: { winner: string; games: number } | null;
};

export default function ResultForm({ seriesId, teamA, teamB, initial }: Props) {
  const router = useRouter();
  const [winner, setWinner] = useState(initial?.winner ?? "");
  const [games, setGames] = useState<number | null>(initial?.games ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    if (!winner || games === null) {
      setError("Pick a winner and number of games.");
      return;
    }
    const fd = new FormData();
    fd.set("seriesId", seriesId);
    fd.set("winner", winner);
    fd.set("games", String(games));
    startTransition(async () => {
      const res = await enterSeriesResult(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function clear() {
    setError(null);
    const fd = new FormData();
    fd.set("seriesId", seriesId);
    startTransition(async () => {
      const res = await clearSeriesResult(fd);
      if (!res.ok) setError(res.error);
      else {
        setWinner("");
        setGames(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium">Winner</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[teamA, teamB].map((t) => {
            const selected = winner === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setWinner(t)}
                className={`rounded-md border p-3 text-sm ${
                  selected
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium">Games</div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {VALID_GAMES.map((g) => {
            const selected = games === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGames(g)}
                className={`rounded-md border p-3 text-sm ${
                  selected
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                }`}
              >
                in {g}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {pending ? "Saving…" : initial ? "Update result" : "Save result"}
        </button>
        {initial ? (
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Clear result
          </button>
        ) : null}
      </div>
    </div>
  );
}
