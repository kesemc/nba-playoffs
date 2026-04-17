/**
 * Scoring simulation — 2024-25 NBA Playoffs.
 *
 * Goal: compare our candidate scoring systems against a realistic pool
 * of 20 friends playing in different styles, using the actual results
 * and estimated pre-series odds from last year's playoffs.
 *
 * Run with:  npx tsx scripts/simulate-scoring.ts
 */

/* eslint-disable no-console */

// ---------- 2024-25 series definitions --------------------------------------

/**
 * Each series is defined by:
 *  - teamA (pre-series favorite), teamB (pre-series underdog)
 *  - pFavGame: per-game win probability we estimate the favorite had
 *    going into the series (combines seeding, record, injuries, market
 *    consensus). This drives the odds grid deterministically.
 *  - actualWinner / actualGames: what really happened.
 */
type Series = {
  id: string;
  label: string;
  round: "R1" | "CSF" | "CF" | "F";
  teamA: string; // pre-series favorite
  teamB: string; // pre-series underdog
  pFavGame: number;
  actualWinner: "A" | "B";
  actualGames: 4 | 5 | 6 | 7;
};

const SERIES: Series[] = [
  // --- First round -----------------------------------------------------------
  {
    id: "OKC-MEM",
    label: "OKC (1) vs MEM (8)",
    round: "R1",
    teamA: "OKC",
    teamB: "MEM",
    pFavGame: 0.80,
    actualWinner: "A",
    actualGames: 4,
  },
  {
    id: "CLE-MIA",
    label: "CLE (1) vs MIA (8)",
    round: "R1",
    teamA: "CLE",
    teamB: "MIA",
    pFavGame: 0.78,
    actualWinner: "A",
    actualGames: 4,
  },
  {
    id: "BOS-ORL",
    label: "BOS (2) vs ORL (7)",
    round: "R1",
    teamA: "BOS",
    teamB: "ORL",
    pFavGame: 0.72,
    actualWinner: "A",
    actualGames: 5,
  },
  {
    id: "HOU-GSW",
    label: "HOU (2) vs GSW (7)",
    round: "R1",
    teamA: "HOU",
    teamB: "GSW",
    pFavGame: 0.56, // Houston slight fav, but GSW pulled off the upset
    actualWinner: "B",
    actualGames: 7,
  },
  {
    id: "NYK-DET",
    label: "NYK (3) vs DET (6)",
    round: "R1",
    teamA: "NYK",
    teamB: "DET",
    pFavGame: 0.60,
    actualWinner: "A",
    actualGames: 6,
  },
  {
    id: "LAL-MIN",
    label: "LAL (3) vs MIN (6)",
    round: "R1",
    teamA: "LAL",
    teamB: "MIN",
    pFavGame: 0.52, // pick'em, tiny LAL lean with home court
    actualWinner: "B",
    actualGames: 5,
  },
  {
    id: "IND-MIL",
    label: "IND (4) vs MIL (5)",
    round: "R1",
    teamA: "IND",
    teamB: "MIL",
    pFavGame: 0.53,
    actualWinner: "A",
    actualGames: 5,
  },
  {
    id: "DEN-LAC",
    label: "DEN (4) vs LAC (5)",
    round: "R1",
    teamA: "DEN",
    teamB: "LAC",
    pFavGame: 0.54,
    actualWinner: "A",
    actualGames: 7,
  },
  // --- Conference semis ------------------------------------------------------
  {
    id: "CLE-IND",
    label: "CLE (1) vs IND (4)",
    round: "CSF",
    teamA: "CLE",
    teamB: "IND",
    pFavGame: 0.60,
    actualWinner: "B",
    actualGames: 5,
  },
  {
    id: "BOS-NYK",
    label: "BOS (2) vs NYK (3)",
    round: "CSF",
    teamA: "BOS",
    teamB: "NYK",
    pFavGame: 0.57, // BOS modest fav; Tatum injury swung it mid-series
    actualWinner: "B",
    actualGames: 6,
  },
  {
    id: "OKC-DEN",
    label: "OKC (1) vs DEN (4)",
    round: "CSF",
    teamA: "OKC",
    teamB: "DEN",
    pFavGame: 0.62,
    actualWinner: "A",
    actualGames: 7,
  },
  {
    id: "MIN-GSW",
    label: "MIN (6) vs GSW (7)",
    round: "CSF",
    teamA: "MIN",
    teamB: "GSW",
    pFavGame: 0.55, // MIN slight fav; Curry injured in G1
    actualWinner: "A",
    actualGames: 5,
  },
  // --- Conference finals -----------------------------------------------------
  {
    id: "NYK-IND",
    label: "NYK (3) vs IND (4)",
    round: "CF",
    teamA: "NYK",
    teamB: "IND",
    pFavGame: 0.52,
    actualWinner: "B",
    actualGames: 6,
  },
  {
    id: "OKC-MIN",
    label: "OKC (1) vs MIN (6)",
    round: "CF",
    teamA: "OKC",
    teamB: "MIN",
    pFavGame: 0.65,
    actualWinner: "A",
    actualGames: 5,
  },
  // --- Finals ----------------------------------------------------------------
  {
    id: "OKC-IND",
    label: "OKC (1) vs IND (4)",
    round: "F",
    teamA: "OKC",
    teamB: "IND",
    pFavGame: 0.72,
    actualWinner: "A",
    actualGames: 7,
  },
];

// ---------- Odds-grid construction ------------------------------------------

/**
 * Best-of-7 probability the given team wins the series in exactly k games,
 * given per-game win probability p (assuming independence).
 *
 *   P(win in 4) = p^4
 *   P(win in 5) = C(4,3) * p^3 * (1-p) * p = 4  * p^4 * (1-p)
 *   P(win in 6) = C(5,3) * p^3 * (1-p)^2 * p = 10 * p^4 * (1-p)^2
 *   P(win in 7) = C(6,3) * p^3 * (1-p)^3 * p = 20 * p^4 * (1-p)^3
 */
function winInExactly(p: number, k: 4 | 5 | 6 | 7): number {
  const q = 1 - p;
  switch (k) {
    case 4: return p ** 4;
    case 5: return 4 * p ** 4 * q;
    case 6: return 10 * p ** 4 * q ** 2;
    case 7: return 20 * p ** 4 * q ** 3;
  }
}

/** Winner-any-score probability. */
function winSeries(p: number): number {
  return winInExactly(p, 4) + winInExactly(p, 5) + winInExactly(p, 6) + winInExactly(p, 7);
}

/**
 * Convert probability -> decimal odds with a typical 7% bookmaker margin
 * spread across both outcomes. Clamped to a sensible minimum.
 */
const BOOK_MARGIN = 0.07;
function probToOdds(prob: number): number {
  if (prob <= 0) return 1000;
  const oddsFair = 1 / prob;
  // Shave a bit so odds roughly reflect what a book posts.
  const shaved = oddsFair / (1 + BOOK_MARGIN / 2);
  return Math.max(1.02, round2(shaved));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type OddsGrid = {
  winnerA: number;
  winnerB: number;
  a4: number; a5: number; a6: number; a7: number;
  b4: number; b5: number; b6: number; b7: number;
};

function oddsFor(series: Series): OddsGrid {
  const pA = series.pFavGame;
  const pB = 1 - pA;
  return {
    winnerA: probToOdds(winSeries(pA)),
    winnerB: probToOdds(winSeries(pB)),
    a4: probToOdds(winInExactly(pA, 4)),
    a5: probToOdds(winInExactly(pA, 5)),
    a6: probToOdds(winInExactly(pA, 6)),
    a7: probToOdds(winInExactly(pA, 7)),
    b4: probToOdds(winInExactly(pB, 4)),
    b5: probToOdds(winInExactly(pB, 5)),
    b6: probToOdds(winInExactly(pB, 6)),
    b7: probToOdds(winInExactly(pB, 7)),
  };
}

// ---------- Scoring options --------------------------------------------------

type SeriesPick = { team: "A" | "B"; games: 4 | 5 | 6 | 7 };

type ScoringFn = (pick: SeriesPick, series: Series, odds: OddsGrid) => number;

function winnerOddsFor(pick: SeriesPick, odds: OddsGrid): number {
  return pick.team === "A" ? odds.winnerA : odds.winnerB;
}

function exactOddsFor(pick: SeriesPick, odds: OddsGrid): number {
  const table: Record<4 | 5 | 6 | 7, number> =
    pick.team === "A"
      ? { 4: odds.a4, 5: odds.a5, 6: odds.a6, 7: odds.a7 }
      : { 4: odds.b4, 5: odds.b5, 6: odds.b6, 7: odds.b7 };
  return table[pick.games];
}

/** Current scheme: winner odds, or exact odds if you nail games. */
const scoreCurrent: ScoringFn = (pick, series, odds) => {
  if (pick.team !== series.actualWinner) return 0;
  if (pick.games === series.actualGames) return exactOddsFor(pick, odds);
  return winnerOddsFor(pick, odds);
};

/** Option A: winner odds + flat bonus on exact. */
function scoreOptionA(bonus: number): ScoringFn {
  return (pick, series, odds) => {
    if (pick.team !== series.actualWinner) return 0;
    const base = winnerOddsFor(pick, odds);
    return pick.games === series.actualGames ? base + bonus : base;
  };
}

/** Option B: geometric mean of winner and exact odds on exact. */
const scoreOptionB: ScoringFn = (pick, series, odds) => {
  if (pick.team !== series.actualWinner) return 0;
  if (pick.games !== series.actualGames) return winnerOddsFor(pick, odds);
  return Math.sqrt(winnerOddsFor(pick, odds) * exactOddsFor(pick, odds));
};

/** Option C: winner odds * multiplier on exact. */
function scoreOptionC(mult: number): ScoringFn {
  return (pick, series, odds) => {
    if (pick.team !== series.actualWinner) return 0;
    const base = winnerOddsFor(pick, odds);
    return pick.games === series.actualGames ? base * mult : base;
  };
}

/** Option D: current scheme but capped at N points per series. */
function scoreOptionD(cap: number): ScoringFn {
  return (pick, series, odds) => Math.min(cap, scoreCurrent(pick, series, odds));
}

const SCORING_OPTIONS: { name: string; fn: ScoringFn }[] = [
  { name: "Current (uncapped)", fn: scoreCurrent },
  { name: "A +2 bonus",         fn: scoreOptionA(2) },
  { name: "A +3 bonus",         fn: scoreOptionA(3) },
  { name: "A +5 bonus",         fn: scoreOptionA(5) },
  { name: "B geo-mean",         fn: scoreOptionB },
  { name: "C x1.5 multiplier",  fn: scoreOptionC(1.5) },
  { name: "C x2.0 multiplier",  fn: scoreOptionC(2.0) },
  { name: "D cap 15",           fn: scoreOptionD(15) },
  { name: "D cap 10",           fn: scoreOptionD(10) },
];

// ---------- Player archetypes ------------------------------------------------

// Deterministic RNG so runs are reproducible.
class RNG {
  private state: number;
  constructor(seed: number) { this.state = seed | 0 || 1; }
  next(): number {
    // xorshift32
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x;
    return ((x >>> 0) / 0xffffffff);
  }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  weighted<T>(items: { value: T; w: number }[]): T {
    const total = items.reduce((s, it) => s + it.w, 0);
    let r = this.next() * total;
    for (const it of items) {
      r -= it.w;
      if (r <= 0) return it.value;
    }
    return items[items.length - 1].value;
  }
}

type Strategy = "bunker" | "risky_upset" | "risky_sniper" | "average";

type Player = { name: string; strategy: Strategy; rngSeed: number };

const PLAYERS: Player[] = [
  { name: "Bunker-1",  strategy: "bunker",       rngSeed: 101 },
  { name: "Bunker-2",  strategy: "bunker",       rngSeed: 102 },
  { name: "Risky-U",   strategy: "risky_upset",  rngSeed: 201 },
  { name: "Risky-S",   strategy: "risky_sniper", rngSeed: 202 },
  // 16 "average" players with different seeds.
  ...Array.from({ length: 16 }, (_, i) => ({
    name: `Avg-${String(i + 1).padStart(2, "0")}`,
    strategy: "average" as Strategy,
    rngSeed: 1000 + i,
  })),
];

function makePick(strategy: Strategy, series: Series, rng: RNG): SeriesPick {
  // Note: teamA is always the favorite by construction of SERIES.
  switch (strategy) {
    case "bunker":
      // Always take the favorite, always pick "in 6" (the modal result).
      return { team: "A", games: 6 };

    case "risky_upset":
      // Always take the underdog; favor long series (the fun upset ride).
      return {
        team: "B",
        games: rng.weighted([
          { value: 7, w: 5 },
          { value: 6, w: 3 },
          { value: 5, w: 1 },
          { value: 4, w: 1 },
        ]),
      };

    case "risky_sniper":
      // Take favorites but chase high-odds exact scores.
      return {
        team: "A",
        games: rng.weighted([
          { value: 4, w: 4 },
          { value: 7, w: 4 },
          { value: 5, w: 1 },
          { value: 6, w: 1 },
        ]),
      };

    case "average": {
      // Favor the favorite, but pick upsets more often when the series is
      // closer (pFavGame close to 0.5).
      const pFav = series.pFavGame;
      const chancePickFav = 0.5 + (pFav - 0.5) * 1.8; // tunable
      const pickFav = rng.next() < chancePickFav;
      const team: "A" | "B" = pickFav ? "A" : "B";
      // Games: realistic distribution centered around 5-6.
      const games = rng.weighted<4 | 5 | 6 | 7>([
        { value: 4, w: 1 },
        { value: 5, w: 3 },
        { value: 6, w: 4 },
        { value: 7, w: 2 },
      ]);
      return { team, games };
    }
  }
}

// ---------- Simulation -------------------------------------------------------

type Totals = Record<string /* player name */, number>;

function runOnce(scoring: ScoringFn): {
  totals: Totals;
  perPlayerPerSeries: Record<string, number[]>;
} {
  const totals: Totals = Object.fromEntries(PLAYERS.map((p) => [p.name, 0]));
  const perPlayerPerSeries: Record<string, number[]> = Object.fromEntries(
    PLAYERS.map((p) => [p.name, []]),
  );

  for (const p of PLAYERS) {
    const rng = new RNG(p.rngSeed);
    for (const s of SERIES) {
      const pick = makePick(p.strategy, s, rng);
      const odds = oddsFor(s);
      const pts = scoring(pick, s, odds);
      totals[p.name] += pts;
      perPlayerPerSeries[p.name].push(pts);
    }
  }

  return { totals, perPlayerPerSeries };
}

// ---------- Metrics ----------------------------------------------------------

function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function stdev(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}
function max(xs: number[]): number { return Math.max(...xs); }
function min(xs: number[]): number { return Math.min(...xs); }

function evaluate(
  name: string,
  totals: Totals,
  perPlayerPerSeries: Record<string, number[]>,
) {
  const all = Object.values(totals);
  const avg = Object.entries(totals)
    .filter(([n]) => n.startsWith("Avg-"))
    .map(([, v]) => v);
  const bunker = Object.entries(totals)
    .filter(([n]) => n.startsWith("Bunker-"))
    .map(([, v]) => v);
  const risky = Object.entries(totals)
    .filter(([n]) => n.startsWith("Risky-"))
    .map(([, v]) => v);

  // "One-shot dominance": for the top scorer, what % of their total came
  // from their single highest-scoring series?
  const sortedPlayers = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const [topName, topTotal] = sortedPlayers[0];
  const topBreakdown = perPlayerPerSeries[topName];
  const topBest = max(topBreakdown);
  const oneShotPct = topTotal > 0 ? (topBest / topTotal) * 100 : 0;

  return {
    name,
    mean: mean(all),
    stdev: stdev(all),
    range: max(all) - min(all),
    avgMean: mean(avg),
    bunkerMean: mean(bunker),
    riskyMean: mean(risky),
    riskyVsBunker: mean(risky) - mean(bunker),
    topPlayer: topName,
    topTotal,
    topBestSeriesPct: oneShotPct,
  };
}

// ---------- Output -----------------------------------------------------------

function fmt(n: number, width = 7): string {
  return n.toFixed(2).padStart(width);
}

function main() {
  console.log("\n=== 2024-25 NBA Playoffs — scoring simulation ===\n");
  console.log(
    "Players: 2 bunker + 2 risky + 16 average = 20. Deterministic seeds.\n",
  );

  // Show per-series odds so we can eyeball the data.
  console.log("Estimated odds (from pFavGame + best-of-7 math, 7% book margin):\n");
  console.log(
    "series".padEnd(22) +
      "winA".padStart(7) + "A-4".padStart(7) + "A-5".padStart(7) +
      "A-6".padStart(7) + "A-7".padStart(7) + " | " +
      "winB".padStart(7) + "B-4".padStart(7) + "B-5".padStart(7) +
      "B-6".padStart(7) + "B-7".padStart(7) + "   result",
  );
  for (const s of SERIES) {
    const o = oddsFor(s);
    console.log(
      s.label.padEnd(22) +
        fmt(o.winnerA) + fmt(o.a4) + fmt(o.a5) + fmt(o.a6) + fmt(o.a7) + " | " +
        fmt(o.winnerB) + fmt(o.b4) + fmt(o.b5) + fmt(o.b6) + fmt(o.b7) +
        `   ${s.actualWinner === "A" ? s.teamA : s.teamB} in ${s.actualGames}`,
    );
  }

  console.log("\n\nScoring comparison (lower range/stdev = closer game):\n");
  console.log(
    "option".padEnd(22) +
      "mean".padStart(8) +
      "stdev".padStart(8) +
      "range".padStart(8) +
      "bunker".padStart(8) +
      "avg".padStart(8) +
      "risky".padStart(8) +
      "r-b".padStart(8) +
      "top%".padStart(8) +
      "  leader",
  );

  const resultsByOption: { name: string; sorted: [string, number][] }[] = [];

  for (const opt of SCORING_OPTIONS) {
    const { totals, perPlayerPerSeries } = runOnce(opt.fn);
    const e = evaluate(opt.name, totals, perPlayerPerSeries);
    console.log(
      e.name.padEnd(22) +
        fmt(e.mean) +
        fmt(e.stdev) +
        fmt(e.range) +
        fmt(e.bunkerMean) +
        fmt(e.avgMean) +
        fmt(e.riskyMean) +
        fmt(e.riskyVsBunker) +
        fmt(e.topBestSeriesPct) +
        "  " +
        e.topPlayer.padEnd(9) +
        `(${e.topTotal.toFixed(1)})`,
    );
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    resultsByOption.push({ name: opt.name, sorted });
  }

  console.log("\n\nTop 5 per option (name: points):\n");
  for (const { name, sorted } of resultsByOption) {
    const top5 = sorted.slice(0, 5)
      .map(([n, v]) => `${n}=${v.toFixed(1)}`)
      .join("  ");
    const last = sorted[sorted.length - 1];
    console.log(`${name.padEnd(22)}  ${top5}    [last: ${last[0]}=${last[1].toFixed(1)}]`);
  }

  console.log(
    "\nLegend:\n" +
      "  mean    = average total across all 20 players\n" +
      "  stdev   = spread of totals (lower = tighter race)\n" +
      "  range   = max total - min total\n" +
      "  bunker  = mean total of the 2 bunker players (favorite + in 6 every time)\n" +
      "  avg     = mean total of the 16 average players\n" +
      "  risky   = mean total of the 2 risky players (upset hunter + exact-score sniper)\n" +
      "  r-b     = risky mean MINUS bunker mean. Positive = risky strategy is rewarded.\n" +
      "  top%    = % of the winner's total that came from their single best series\n" +
      "            (high = one lucky hit dominated the tournament)\n",
  );
}

main();
