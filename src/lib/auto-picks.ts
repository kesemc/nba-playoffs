import { prisma } from "@/lib/db";
import { VALID_GAMES } from "@/lib/teams";

/**
 * Auto-pick policy for users who didn't place a bet before the series lock.
 *
 * Rather than having some users sit a series out entirely, any user without
 * a recorded pick at lock time is assigned a completely random pick (team +
 * exact games). From then on the row is an ordinary Pick — it shows up in
 * "All picks" once the series is visible and scores like anyone else's.
 *
 * The fill is lazy: it happens the first time anyone loads the locked series
 * detail page or the leaderboard is computed. No cron, no background job.
 *
 * Idempotency:
 * - `(userId, seriesId)` is uniquely-indexed, and we use `skipDuplicates` so
 *   concurrent callers can't create doubles.
 * - Once a user has a pick (manual or auto), subsequent calls are no-ops.
 */
export async function ensureAutoPicksForLockedSeries(
  seriesId: string,
): Promise<number> {
  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: { id: true, teamA: true, teamB: true, lockTime: true },
  });
  if (!series) return 0;
  if (series.lockTime.getTime() > Date.now()) return 0; // not locked yet

  // Users without a pick on this series. Prisma doesn't have a convenient
  // "anti-join" helper, so we do two small lookups and diff in memory.
  // The user table is small (friends pool), so this is fine.
  const [users, existingPicks] = await Promise.all([
    prisma.user.findMany({ select: { id: true } }),
    prisma.pick.findMany({
      where: { seriesId },
      select: { userId: true },
    }),
  ]);

  const withPick = new Set(existingPicks.map((p) => p.userId));
  const missing = users.filter((u) => !withPick.has(u.id));
  if (missing.length === 0) return 0;

  const rows = missing.map((u) => ({
    userId: u.id,
    seriesId,
    pickedTeam: randomPick([series.teamA, series.teamB]),
    pickedGames: randomPick([...VALID_GAMES]),
  }));

  const res = await prisma.pick.createMany({
    data: rows,
    skipDuplicates: true, // race-safe: concurrent callers can't dupe
  });
  return res.count;
}

/**
 * Pick a uniformly-random element. Uses Math.random — this is a friendly
 * pool game, not a casino; we don't need crypto-grade randomness, and we
 * don't want the overhead either.
 */
function randomPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
