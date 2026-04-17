import { ROUND_LABELS, type Round } from "@/lib/teams";
import { formatIsraelDateTime } from "@/lib/tz";

export function formatRound(round: string): string {
  if (round in ROUND_LABELS) return ROUND_LABELS[round as Round];
  return round;
}

export function formatDateTime(d: Date): string {
  return formatIsraelDateTime(d);
}

export function formatOdds(o: number): string {
  // Two decimals unless the number is large (>= 10), in which case one decimal
  // is usually how books display (e.g. "18.0" -> "18").
  if (!Number.isFinite(o)) return "—";
  if (o >= 10) return o.toFixed(o % 1 === 0 ? 0 : 1);
  return o.toFixed(2);
}

export function formatPoints(p: number | null | undefined): string {
  if (p === null || p === undefined) return "—";
  return formatOdds(p);
}
