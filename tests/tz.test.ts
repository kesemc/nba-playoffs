import { describe, it, expect } from "vitest";
import {
  formatIsraelDateTime,
  israelWallclockToUtc,
  utcToIsraelWallclock,
} from "../src/lib/tz";

describe("tz helpers", () => {
  it("round-trips wallclock ↔ UTC during IDT (UTC+3)", () => {
    // May 1, 2026 is firmly in IDT (Israel Daylight Time, UTC+3).
    const wall = "2026-05-01T20:00";
    const utc = israelWallclockToUtc(wall);
    // 20:00 IDT = 17:00 UTC
    expect(utc.toISOString()).toBe("2026-05-01T17:00:00.000Z");
    expect(utcToIsraelWallclock(utc)).toBe(wall);
  });

  it("round-trips wallclock ↔ UTC during IST (UTC+2)", () => {
    // January in Israel is IST (standard time, UTC+2).
    const wall = "2026-01-15T09:30";
    const utc = israelWallclockToUtc(wall);
    // 09:30 IST = 07:30 UTC
    expect(utc.toISOString()).toBe("2026-01-15T07:30:00.000Z");
    expect(utcToIsraelWallclock(utc)).toBe(wall);
  });

  it("formats a Date in Israel time regardless of host TZ", () => {
    // 17:00 UTC on May 1, 2026 is 20:00 IDT.
    const d = new Date("2026-05-01T17:00:00.000Z");
    const s = formatIsraelDateTime(d);
    // Shape is locale-dependent, but it must include "8:00 PM" and an
    // Israel TZ indicator.
    expect(s).toMatch(/8:00\s*PM/);
    expect(s).toMatch(/IDT|GMT\+3/);
  });
});
