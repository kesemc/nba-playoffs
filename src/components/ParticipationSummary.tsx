import type { Participation } from "@/lib/series-queries";

/**
 * Renders a pre-lock participation line for a series:
 *   "9 / 12 picked · Waiting on Alice, Bob"
 *
 * Or, when everyone's submitted:
 *   "12 / 12 picked · Everyone's in"
 *
 * Deliberately reveals only participation (who / how many have submitted),
 * not pick content — keeping the "blind until tipoff" rule intact.
 */
export default function ParticipationSummary({
  participation,
  variant = "default",
}: {
  participation: Participation;
  variant?: "default" | "compact";
}) {
  const { pickedCount, totalUsers, missingNames } = participation;
  if (totalUsers === 0) return null;

  const allIn = missingNames.length === 0;
  const textSize = variant === "compact" ? "text-xs" : "text-sm";

  return (
    <div
      className={`${textSize} text-neutral-600 dark:text-neutral-400`}
      aria-label="Participation status"
    >
      <span className="tabular-nums font-medium">
        {pickedCount} / {totalUsers} picked
      </span>
      {allIn ? (
        <span className="ml-2 text-emerald-600 dark:text-emerald-400">
          · Everyone&apos;s in
        </span>
      ) : (
        <>
          <span className="mx-2 text-neutral-400">·</span>
          <span>
            Waiting on{" "}
            <span className="text-neutral-700 dark:text-neutral-300">
              {missingNames.join(", ")}
            </span>
          </span>
        </>
      )}
    </div>
  );
}
