import TeamLogo from "@/components/bracket/TeamLogo";
import { gamesWonBy, type BracketSeries } from "@/lib/bracket";
import { getTeamNickname } from "@/lib/teams";

type Variant = "full" | "compact";

/**
 * One matchup on the bracket — two team rows stacked, winner highlighted
 * if the admin has entered a result. The loser's row is dimmed so the
 * eye lands on the winner at a glance.
 *
 * Two variants:
 *   - "full" (default): full team name ("Boston Celtics"), used in the
 *     stacked mobile layout.
 *   - "compact": nickname only ("Celtics"), used in the horizontal
 *     desktop bracket where column width is tight.
 */
export default function MatchupCard({
  series,
  variant = "full",
}: {
  series: BracketSeries;
  variant?: Variant;
}) {
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
        games={gamesWonBy(teamA, result)}
        variant={variant}
      />
      <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
      <TeamRow
        team={teamB}
        isWinner={winnerTeam === teamB}
        isLoser={loserTeam === teamB}
        games={gamesWonBy(teamB, result)}
        variant={variant}
      />
    </div>
  );
}


function TeamRow({
  team,
  isWinner,
  isLoser,
  games,
  variant,
}: {
  team: string;
  isWinner: boolean;
  isLoser: boolean;
  games: number | null;
  variant: Variant;
}) {
  const isCompact = variant === "compact";
  const label = isCompact ? getTeamNickname(team) : team;
  const logoSize = isCompact ? 22 : 28;
  const padding = isCompact ? "px-2 py-1.5" : "px-3 py-2";

  return (
    <div
      className={`flex items-center justify-between gap-2 ${padding} ${
        isWinner
          ? "bg-emerald-50 dark:bg-emerald-950/30"
          : isLoser
            ? "opacity-55"
            : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <TeamLogo team={team} size={logoSize} />
        <span
          className={`truncate ${isCompact ? "text-xs" : "text-sm"} ${
            isWinner ? "font-semibold" : "font-medium"
          } ${isLoser ? "line-through" : ""}`}
          title={team}
        >
          {label}
        </span>
      </div>
      {games !== null ? (
        <span
          className={`tabular-nums ${isCompact ? "text-xs" : "text-sm"} ${
            isWinner ? "font-semibold" : ""
          }`}
        >
          {games}
        </span>
      ) : null}
    </div>
  );
}
