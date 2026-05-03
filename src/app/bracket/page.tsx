import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import MatchupCard from "@/components/bracket/MatchupCard";
import BracketGrid from "@/components/bracket/BracketGrid";
import {
  buildBracket,
  type BracketData,
  type BracketSeries,
} from "@/lib/bracket";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bracket · NBA Playoffs Pool" };

export default async function BracketPage() {
  await requireUser();

  const rows = await prisma.series.findMany({
    include: { result: true },
    orderBy: { createdAt: "asc" },
  });

  const seriesList: BracketSeries[] = rows.map((s) => ({
    id: s.id,
    // DB stores round as a string; the union type is enforced at insert time.
    round: s.round as BracketSeries["round"],
    teamA: s.teamA,
    teamB: s.teamB,
    createdAt: s.createdAt,
    result: s.result
      ? { winner: s.result.winner, games: s.result.games }
      : null,
  }));

  const bracket = buildBracket(seriesList);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Bracket</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Live bracket — updated as the admin enters results. Completed series
          show the winner and the final game count.
        </p>
      </header>

      {/* Desktop: classic horizontal bracket. Horizontally scrollable if the
          viewport is narrower than the bracket's natural width. */}
      <div className="hidden lg:block">
        <BracketGrid bracket={bracket} />
      </div>

      {/* Mobile/tablet: stacked round-by-round layout (existing design).
          A horizontal bracket doesn't read well on small screens. */}
      <div className="lg:hidden space-y-10">
        <RoundSection title="First Round" split={bracket.R1} />
        <RoundSection title="Conference Semifinals" split={bracket.R2} />
        <RoundSection title="Conference Finals" split={bracket.CF} />
        <FinalsSection finals={bracket.F} />
        {seriesList.length === 0 ? <EmptyBracket /> : null}
      </div>
    </main>
  );
}

function RoundSection({
  title,
  split,
}: {
  title: string;
  split: BracketData["R1"];
}) {
  // Mobile is a compact stacked list per conference — slot positions
  // (used by the desktop bracket) don't matter here, so we drop nulls.
  const east = compact(split.east);
  const west = compact(split.west);
  if (east.length + west.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ConferenceColumn label="West" series={west} />
        <ConferenceColumn label="East" series={east} />
      </div>
    </section>
  );
}

function compact(slots: BracketData["R1"]["east"]): BracketSeries[] {
  return slots.filter((s): s is BracketSeries => s !== null);
}

function ConferenceColumn({
  label,
  series,
}: {
  label: "East" | "West";
  series: BracketSeries[];
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-neutral-500">{label}</div>
      {series.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-3 py-4 text-xs text-neutral-500 dark:border-neutral-800">
          No {label.toLowerCase()} series in this round yet.
        </p>
      ) : (
        <div className="space-y-2">
          {series.map((s) => (
            <MatchupCard key={s.id} series={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function FinalsSection({ finals }: { finals: BracketSeries[] }) {
  if (finals.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500">
        NBA Finals
      </h2>
      <div className="mx-auto max-w-md space-y-2">
        {finals.map((s) => (
          <MatchupCard key={s.id} series={s} />
        ))}
      </div>
    </section>
  );
}

function EmptyBracket() {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-500">
        No series have been created yet. The bracket will fill in as the admin
        adds matchups.
      </p>
    </div>
  );
}
