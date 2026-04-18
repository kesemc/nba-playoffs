import { prisma } from "@/lib/db";
import { scorePick, type OddsRow } from "@/lib/scoring";
import { ensureAutoPicksForLockedSeries } from "@/lib/auto-picks";

export type SeriesWithEverything = {
  id: string;
  round: string;
  teamA: string;
  teamB: string;
  lockTime: Date;
  odds: OddsRow[];
  result: { winner: string; games: number } | null;
  myPick: { pickedTeam: string; pickedGames: number } | null;
  isLocked: boolean;
};

export async function listSeriesForUser(
  userId: string,
): Promise<SeriesWithEverything[]> {
  const rows = await prisma.series.findMany({
    orderBy: [{ lockTime: "asc" }],
    include: {
      odds: true,
      result: true,
      picks: {
        where: { userId },
      },
    },
  });
  const now = Date.now();
  return rows.map((s) => ({
    id: s.id,
    round: s.round,
    teamA: s.teamA,
    teamB: s.teamB,
    lockTime: s.lockTime,
    odds: s.odds.map((o) => ({ team: o.team, games: o.games, odds: o.odds })),
    result: s.result
      ? { winner: s.result.winner, games: s.result.games }
      : null,
    myPick: s.picks[0]
      ? {
          pickedTeam: s.picks[0].pickedTeam,
          pickedGames: s.picks[0].pickedGames,
        }
      : null,
    isLocked: s.lockTime.getTime() <= now,
  }));
}

export async function getSeriesDetail(
  seriesId: string,
  viewerId: string,
): Promise<
  | (SeriesWithEverything & {
      allPicks: {
        userId: string;
        displayName: string;
        pickedTeam: string;
        pickedGames: number;
        points: number | null; // null when no result yet
      }[];
    })
  | null
> {
  // If the series is already locked, make sure any no-show users get their
  // random auto-pick written before we read. Safe to run unconditionally —
  // the helper checks lockTime and bails early if still open.
  await ensureAutoPicksForLockedSeries(seriesId);

  const s = await prisma.series.findUnique({
    where: { id: seriesId },
    include: {
      odds: true,
      result: true,
      picks: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!s) return null;

  const now = Date.now();
  const isLocked = s.lockTime.getTime() <= now;
  const odds: OddsRow[] = s.odds.map((o) => ({
    team: o.team,
    games: o.games,
    odds: o.odds,
  }));
  const result = s.result
    ? { winner: s.result.winner, games: s.result.games }
    : null;

  const myPickRow = s.picks.find((p) => p.userId === viewerId) ?? null;
  const myPick = myPickRow
    ? {
        pickedTeam: myPickRow.pickedTeam,
        pickedGames: myPickRow.pickedGames,
      }
    : null;

  // Privacy rule: other users' picks are hidden until lock.
  const visiblePicks = isLocked
    ? s.picks
    : s.picks.filter((p) => p.userId === viewerId);

  const allPicks = visiblePicks.map((p) => ({
    userId: p.userId,
    displayName: p.user.name ?? p.user.email ?? "Unknown",
    pickedTeam: p.pickedTeam,
    pickedGames: p.pickedGames,
    points: result
      ? scorePick(
          { team: p.pickedTeam, games: p.pickedGames },
          result,
          odds,
        )
      : null,
  }));

  return {
    id: s.id,
    round: s.round,
    teamA: s.teamA,
    teamB: s.teamB,
    lockTime: s.lockTime,
    odds,
    result,
    myPick,
    isLocked,
    allPicks,
  };
}

export async function computeLeaderboard(): Promise<
  { userId: string; displayName: string; points: number }[]
> {
  // Backfill random auto-picks for every already-locked series before we
  // compute totals. Without this, users who never submitted a pick would
  // silently score 0 for that series instead of getting a random pick.
  // Only series with a result affect scoring, so we only bother with those.
  const lockedResulted = await prisma.series.findMany({
    where: {
      lockTime: { lte: new Date() },
      result: { isNot: null },
    },
    select: { id: true },
  });
  await Promise.all(
    lockedResulted.map((s) => ensureAutoPicksForLockedSeries(s.id)),
  );

  const [users, picks, seriesList] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
    prisma.pick.findMany({ select: { userId: true, seriesId: true, pickedTeam: true, pickedGames: true } }),
    prisma.series.findMany({
      include: { odds: true, result: true },
    }),
  ]);

  const seriesById = new Map(seriesList.map((s) => [s.id, s]));
  const totals = new Map<string, number>();

  for (const p of picks) {
    const s = seriesById.get(p.seriesId);
    if (!s || !s.result) continue;
    const pts = scorePick(
      { team: p.pickedTeam, games: p.pickedGames },
      { winner: s.result.winner, games: s.result.games },
      s.odds.map((o) => ({ team: o.team, games: o.games, odds: o.odds })),
    );
    totals.set(p.userId, (totals.get(p.userId) ?? 0) + pts);
  }

  const rows = users.map((u) => ({
    userId: u.id,
    displayName: u.name ?? u.email ?? "Unknown",
    points: totals.get(u.id) ?? 0,
  }));

  rows.sort(
    (a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName),
  );
  return rows;
}
