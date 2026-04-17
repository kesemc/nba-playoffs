import SeriesForm from "@/components/admin/SeriesForm";

export default function NewSeriesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">New series</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Copy the series odds from bet365. Enter all 10 cells — winner odds
          are the &ldquo;to win series&rdquo; line and the four &ldquo;in N games&rdquo; cells
          are the correct-score market.
        </p>
      </header>
      <SeriesForm mode="create" />
    </main>
  );
}
