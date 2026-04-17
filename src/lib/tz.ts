// Timezone helpers. The pool is run in Israel, so all user-facing times are
// formatted in Asia/Jerusalem regardless of where the request is rendered
// (Vercel runs servers in UTC). The admin form also interprets "wallclock"
// values as Israel time so DST transitions are handled correctly.

export const ISRAEL_TZ = "Asia/Jerusalem";

/**
 * Format a Date as a human-readable string in Israel time, e.g.
 *   "Thu, Apr 16, 11:15 PM IDT".
 */
export function formatIsraelDateTime(d: Date): string {
  return d.toLocaleString("en-US", {
    timeZone: ISRAEL_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Convert a UTC Date into the wallclock string format expected by
 * <input type="datetime-local">, rendered in Israel time: "YYYY-MM-DDTHH:mm".
 */
export function utcToIsraelWallclock(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  // Intl sometimes emits "24" for midnight; normalize to "00".
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/**
 * Interpret a "YYYY-MM-DDTHH:mm" wallclock string as Israel time and return
 * the equivalent UTC Date. Handles DST correctly by using the actual
 * Asia/Jerusalem offset at the target moment (re-checking near DST boundaries).
 */
export function israelWallclockToUtc(wallclock: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    wallclock,
  );
  if (!m) {
    throw new Error(`Invalid wallclock: ${wallclock}`);
  }
  const [, y, mo, d, h, mi, s] = m;
  const year = Number(y);
  const month = Number(mo) - 1;
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s ?? "0");

  // First pass: pretend the wallclock is UTC, then correct by the Jerusalem
  // offset at that instant.
  const guess = new Date(Date.UTC(year, month, day, hour, minute, second));
  const offset1 = israelOffsetMinutes(guess);
  const firstUtc = new Date(guess.getTime() - offset1 * 60_000);

  // Re-check: the offset at the *corrected* moment may differ (DST boundary).
  const offset2 = israelOffsetMinutes(firstUtc);
  if (offset2 === offset1) return firstUtc;
  return new Date(guess.getTime() - offset2 * 60_000);
}

/** Asia/Jerusalem offset at the given instant, in minutes east of UTC. */
function israelOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ISRAEL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  const hour = get("hour") === 24 ? 0 : get("hour");
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  return Math.round((asIfUtc - at.getTime()) / 60_000);
}
