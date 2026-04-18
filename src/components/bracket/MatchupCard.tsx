import TeamLogo from "@/components/bracket/TeamLogo";
import type { BracketSeries } from "@/lib/bracket";

/**
 * One matchup on the bracket — two team rows stacked, winner highlighted
 * if the admin has entered a result. The loser's row is dimmed so the
 * eye lands on the winner at a glance.
 */
export default function MatchupCard({ series }: { series: BracketSeries }) {
  const { teamA, teamB, result } = series;
  const winnerTeam = result?.winner ?? null;
  const loserTeam = winnerTeam
    ? winnerTeam === teamA
      ? teamB
      : teamA
    : null;

  return (
    <div className="rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <TeamRow
        team={teamA}
        isWinner={winnerTeam === teamA}
        isLoser={loserTeam === teamA}
        games={gamesFor(teamA, result)}
      />
      <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
      <TeamRow
        team={teamB}
        isWinner={winnerTeam === teamB}
        isLoser={loserTeam === teamB}
        games={gamesFor(teamB, result)}
      />
    </div>
  );
}

function gamesFor(
  team: string,
  result: { winner: string; games: number } | null,
): number | null {
  if (!result) return null;
  if (team === result.winner) return result.games;
  // Loser's game count = total series length minus 4 (wins needed to clinch).
  // e.g. winner in 6 → loser won 2.
  return result.games - 4;
}

function TeamRow({
  team,
  isWinner,
  isLoser,
  games,
}: {
  team: string;
  isWinner: boolean;
  isLoser: boolean;
  games: number | null;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 ${
        isWinner
          ? "bg-emerald-50 dark:bg-emerald-950/30"
          : isLoser
            ? "opacity-55"
            : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <TeamLogo team={team} size={28} />
        <span
          className={`truncate text-sm ${
            isWinner ? "font-semibold" : "font-medium"
          } ${isLoser ? "line-through" : ""}`}
        >
          {team}
        </span>
      </div>
      {games !== null ? (
        <span
          className={`tabular-nums text-sm ${
            isWinner ? "font-semibold" : ""
          }`}
        >
          {games}
        </span>
      ) : null}
    </div>
  );
}
