import { prisma } from "@/lib/db";

/**
 * Seam for obtaining the real-world result of a series.
 *
 * v1 uses `ManualResultsProvider` — reads whatever the admin typed into the
 * `SeriesResult` table. Later we can add e.g. `BallDontLieResultsProvider`
 * that calls an NBA API, with no other code changes.
 */
export interface ResultsProvider {
  getSeriesResult(
    seriesId: string,
  ): Promise<{ winner: string; games: number } | null>;
}

export class ManualResultsProvider implements ResultsProvider {
  async getSeriesResult(seriesId: string) {
    const row = await prisma.seriesResult.findUnique({ where: { seriesId } });
    if (!row) return null;
    return { winner: row.winner, games: row.games };
  }
}

export function getResultsProvider(): ResultsProvider {
  // Switch here once an API-backed provider is added. Keep the env flag
  // name stable so production can be reconfigured without a redeploy
  // beyond env-var changes.
  const kind = process.env.RESULTS_PROVIDER ?? "manual";
  switch (kind) {
    case "manual":
    default:
      return new ManualResultsProvider();
  }
}
