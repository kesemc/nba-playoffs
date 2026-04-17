import { requireUser } from "@/lib/auth-helpers";
import { computeLeaderboard } from "@/lib/series-queries";
import LeaderboardTable from "@/components/LeaderboardTable";
import { prisma } from "@/lib/db";
import {
  computePrizeBreakdown,
  readPoolConfig,
  type PrizeBreakdown,
} from "@/lib/prize-pool";

export const dynamic = "force-dynamic";

async function readPoolInfo(): Promise<PrizeBreakdown | null> {
  const config = readPoolConfig();
  if (!config) return null;

  const envCountRaw = process.env.POOL_PLAYER_COUNT?.trim();
  const envCount = envCountRaw ? Number(envCountRaw) : NaN;
  const playerCount =
    Number.isFinite(envCount) && envCount > 0
      ? Math.floor(envCount)
      : await prisma.user.count();

  if (playerCount <= 0) return null;
  return computePrizeBreakdown(config, playerCount);
}

export default async function LeaderboardPage() {
  await requireUser();
  const [rows, pool] = await Promise.all([computeLeaderboard(), readPoolInfo()]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Auto-refreshes every 15 seconds as new results come in.
        </p>
      </header>
      <LeaderboardTable
        initialData={{ rows, computedAt: new Date().toISOString() }}
        pool={pool}
      />
    </main>
  );
}
