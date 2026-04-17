import { requireUser } from "@/lib/auth-helpers";
import { computeLeaderboard } from "@/lib/series-queries";
import LeaderboardTable from "@/components/LeaderboardTable";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  await requireUser();
  const rows = await computeLeaderboard();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Auto-refreshes every 15 seconds as new results come in.
        </p>
      </header>
      <LeaderboardTable initialData={{ rows, computedAt: new Date().toISOString() }} />
    </main>
  );
}
