/**
 * Placeholder card shown when a bracket position exists in the layout
 * but no series has been created (or the teams haven't been decided yet).
 * Keeps the bracket visually complete from day 1.
 */
export default function TBDSlot() {
  return (
    <div
      className="rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 min-h-[60px] flex flex-col justify-center gap-1"
      aria-label="Matchup to be determined"
    >
      <TbdRow />
      <div className="h-px bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />
      <TbdRow />
    </div>
  );
}

function TbdRow() {
  return (
    <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-600">
      <div className="w-4 h-4 rounded-full border border-dashed border-current shrink-0" aria-hidden="true" />
      <span className="text-[11px] uppercase tracking-wider">TBD</span>
    </div>
  );
}
