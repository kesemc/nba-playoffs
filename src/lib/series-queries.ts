import { prisma } from "@/lib/db";
import { scorePick, type OddsRow } from "@/lib/scoring";
import { ensureAutoPicksForLockedSeries } from "@/lib/auto-picks";

export type Participation = {
  /** How many registered users have submitted a pick for this series. */
  pickedCount: number;
  /** Total registered users (the denominator in "X / N picked"). */
  totalUsers: number;
  /**
   * Display names of users who have NOT picked yet, alphabetically sorted.
   * Pre-lock only — we don't reveal participation status once a series is
   * locked (auto-picks have filled it anyway).
   */
  missingNames: string[];
};

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
  /** Participation snapshot. Null once the series locks. */
  participation: Participation | null;
};

function displayNameOf(u: { name: string | null; email: string | null }): string {
  return u.name ?? u.email ?? "Unknown";
}

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

  // Participation (pre-lock only): fetch all users + all picks for pre-lock
  // series in two batched queries, so we can compute "who hasn't picked"
  // without going N+1.
  const preLockIds = rows
    .filter((s) => s.lockTime.getTime() > now)
    .map((s) => s.id);

  const [users, preLockPicks] = await Promise.all([
    preLockIds.length > 0
      ? prisma.user.findMany({
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([] as { id: string; name: string | null; email: string | null }[]),
    preLockIds.length > 0
      ? prisma.pick.findMany({
          where: { seriesId: { in: preLockIds } },
          select: { userId: true, seriesId: true },
        })
      : Promise.resolve([] as { userId: string; seriesId: string }[]),
  ]);

  const pickedBySeries = new Map<string, Set<string>>();
  for (const p of preLockPicks) {
    let set = pickedBySeries.get(p.seriesId);
    if (!set) {
      set = new Set();
      pickedBySeries.set(p.seriesId, set);
    }
    set.add(p.userId);
  }

  return rows.map((s) => {
    const isLocked = s.lockTime.getTime() <= now;

    let participation: Participation | null = null;
    if (!isLocked) {
      const pickedIds = pickedBySeries.get(s.id) ?? new Set<string>();
      const missingNames = users
        .filter((u) => !pickedIds.has(u.id))
        .map(displayNameOf)
        .sort((a, b) => a.localeCompare(b));
      participation = {
        pickedCount: pickedIds.size,
        totalUsers: users.length,
        missingNames,
      };
    }

    return {
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
      isLocked,
      participation,
    };
  });
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

  // Pre-lock participation snapshot. We need the full user list to know who
  // *hasn't* picked — s.picks only contains the users who have.
  let participation: Participation | null = null;
  if (!isLocked) {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
    });
    const pickedIds = new Set(s.picks.map((p) => p.userId));
    const missingNames = users
      .filter((u) => !pickedIds.has(u.id))
      .map(displayNameOf)
      .sort((a, b) => a.localeCompare(b));
    participation = {
      pickedCount: pickedIds.size,
      totalUsers: users.length,
      missingNames,
    };
  }

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
    participation,
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
