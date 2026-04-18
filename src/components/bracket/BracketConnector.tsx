/**
 * Bracket connector lines between rounds.
 *
 * We use a single SVG with preserveAspectRatio="none" so the 0-100 viewbox
 * stretches to fill whatever column height the CSS flex layout gives us.
 * All coordinates are expressed as percentages (out of 100) so the math
 * matches flexbox's `justify-around` distribution exactly:
 *
 *   - 4 items with justify-around:  centers at 12.5, 37.5, 62.5, 87.5
 *   - 2 items with justify-around:  centers at 25, 75
 *   - 1 item centered:              at 50
 *
 * The connector pattern is a Y:
 *   ─┐
 *    ├─
 *   ─┘
 *
 * "right" direction means west-flowing (inputs on left, output on right).
 * "left" direction is the mirror, used for the eastern half.
 */

type ConnectorType = "four-to-two" | "two-to-one" | "one-to-one";
type Direction = "right" | "left";

export default function BracketConnector({
  type,
  direction,
}: {
  type: ConnectorType;
  direction: Direction;
}) {
  return (
    <div className="flex flex-col w-8 shrink-0 sm:w-10">
      {/* Spacer matches the round-label row height so body lines up */}
      <div className="h-8" aria-hidden="true" />
      <div className="flex-1 py-2">
        <svg
          viewBox="0 0 20 100"
          preserveAspectRatio="none"
          className="h-full w-full text-neutral-400 dark:text-neutral-600"
          aria-hidden="true"
        >
          <path
            d={pathFor(type, direction)}
            stroke="currentColor"
            strokeWidth="0.6"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}

function pathFor(type: ConnectorType, direction: Direction): string {
  // Canonical ("right" = west-flowing) paths.
  //
  // For a Y with input centers at y1, y2 and output center at (y1+y2)/2:
  //   - draw horizontal lines from x=0 to x=10 at y1 and y2
  //   - draw vertical segment at x=10 from y1 to y2
  //   - draw horizontal line from x=10 to x=20 at the midpoint
  const rightPath = (() => {
    switch (type) {
      case "four-to-two":
        // Two Ys stacked: (12.5,37.5)→25 on top, (62.5,87.5)→75 on bottom
        return [
          "M 0 12.5 H 10 V 37.5 H 0",
          "M 10 25 H 20",
          "M 0 62.5 H 10 V 87.5 H 0",
          "M 10 75 H 20",
        ].join(" ");
      case "two-to-one":
        // One Y: (25, 75) → 50
        return "M 0 25 H 10 V 75 H 0 M 10 50 H 20";
      case "one-to-one":
        // Straight through
        return "M 0 50 H 20";
    }
  })();

  if (direction === "right") return rightPath;
  // Mirror horizontally for the east side. The viewbox is 0..20 wide,
  // so x -> 20 - x turns every right-flowing path into a left-flowing one.
  return mirrorX(rightPath, 20);
}

/**
 * Mirror an SVG path horizontally within a given viewbox width. Handles
 * only the absolute commands we emit above: M (x y), H (x), V (y).
 */
function mirrorX(path: string, width: number): string {
  const tokens = path.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok === "M") {
      out.push("M", String(width - Number(tokens[i + 1])), tokens[i + 2]);
      i += 3;
    } else if (tok === "H") {
      out.push("H", String(width - Number(tokens[i + 1])));
      i += 2;
    } else if (tok === "V") {
      out.push("V", tokens[i + 1]);
      i += 2;
    } else {
      // Unknown command — skip defensively.
      out.push(tok);
      i += 1;
    }
  }
  return out.join(" ");
}
