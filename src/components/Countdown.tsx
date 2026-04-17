"use client";

import { useEffect, useState } from "react";

function fmt(ms: number): string {
  if (ms <= 0) return "LOCKED";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Countdown({ lockTime }: { lockTime: string }) {
  const target = new Date(lockTime).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) {
    // Avoid a hydration mismatch: render a stable placeholder on first paint.
    return <span className="tabular-nums text-neutral-500">—</span>;
  }

  const remaining = target - now;
  const locked = remaining <= 0;
  return (
    <span
      className={`tabular-nums ${
        locked
          ? "text-red-600 dark:text-red-400"
          : "text-neutral-700 dark:text-neutral-300"
      }`}
    >
      {fmt(remaining)}
    </span>
  );
}
