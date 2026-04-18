import MatchupCard from "@/components/bracket/MatchupCard";
import TBDSlot from "@/components/bracket/TBDSlot";
import BracketConnector from "@/components/bracket/BracketConnector";
import type { BracketData, BracketSeries } from "@/lib/bracket";

/**
 * Classic bracket layout (Sporting-News style):
 *
 *   West R1 → West R2 → WCF →│ Finals │← ECF ← East R2 ← East R1
 *
 * Implementation notes:
 *   - Each round is a flex column with `justify-around`, which places
 *     N items at centers (2k-1)/(2N). This aligns perfectly across rounds:
 *       4 items: 12.5, 37.5, 62.5, 87.5
 *       2 items: 25, 75            (= averages of adjacent 4-item centers)
 *       1 item:  50                (= average of 2-item centers)
 *   - `items-stretch` on the outer flex makes every column the same height
 *     so the alignment holds regardless of card height.
 *   - Missing series are padded with TBD placeholders so the bracket
 *     shape is visible from day 1 (before any series are created).
 *   - Connectors are SVG with preserveAspectRatio="none" so they stretch
 *     to the column height with matching coordinates.
 */
export default function BracketGrid({ bracket }: { bracket: BracketData }) {
  const westR1 = padSlots(bracket.R1.west, 4);
  const westR2 = padSlots(bracket.R2.west, 2);
  const westCF = padSlots(bracket.CF.west, 1);
  const eastR1 = padSlots(bracket.R1.east, 4);
  const eastR2 = padSlots(bracket.R2.east, 2);
  const eastCF = padSlots(bracket.CF.east, 1);
  const finals = padSlots(bracket.F, 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-stretch min-h-[640px] min-w-[1280px] text-sm">
        <RoundColumn label="First Round" matchups={westR1} />
        <BracketConnector type="four-to-two" direction="right" />
        <RoundColumn label="Conf. Semis" matchups={westR2} />
        <BracketConnector type="two-to-one" direction="right" />
        <RoundColumn label="Western Finals" matchups={westCF} />
        <BracketConnector type="one-to-one" direction="right" />
        <RoundColumn label="NBA Finals" matchups={finals} emphasis />
        <BracketConnector type="one-to-one" direction="left" />
        <RoundColumn label="Eastern Finals" matchups={eastCF} />
        <BracketConnector type="two-to-one" direction="left" />
        <RoundColumn label="Conf. Semis" matchups={eastR2} />
        <BracketConnector type="four-to-two" direction="left" />
        <RoundColumn label="First Round" matchups={eastR1} />
      </div>
      <div className="mt-2 flex justify-between px-2 text-[10px] uppercase tracking-widest text-neutral-400 min-w-[1280px]">
        <span>Western Conference →</span>
        <span>← Eastern Conference</span>
      </div>
    </div>
  );
}

function padSlots<T>(items: readonly T[], target: number): (T | null)[] {
  const slots: (T | null)[] = items.slice();
  while (slots.length < target) slots.push(null);
  // Defensive: if the admin over-creates (shouldn't happen in practice),
  // cap at `target` so the bracket geometry stays consistent.
  return slots.slice(0, target);
}

function RoundColumn({
  label,
  matchups,
  emphasis = false,
}: {
  label: string;
  matchups: (BracketSeries | null)[];
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col flex-1 min-w-[150px] max-w-[200px]">
      <div
        className={`h-8 flex items-center justify-center text-[10px] uppercase tracking-widest ${
          emphasis
            ? "font-bold text-neutral-800 dark:text-neutral-200"
            : "font-medium text-neutral-500"
        }`}
      >
        {label}
      </div>
      <div className="flex-1 flex flex-col justify-around gap-2 py-2">
        {matchups.map((s, i) =>
          s ? (
            <MatchupCard key={s.id} series={s} variant="compact" />
          ) : (
            <TBDSlot key={`tbd-${i}`} />
          ),
        )}
      </div>
    </div>
  );
}
