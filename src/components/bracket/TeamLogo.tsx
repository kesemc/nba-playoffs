"use client";

import { useState } from "react";
import { getTeamLogoUrl, getTeamTricode } from "@/lib/teams";

type Props = {
  team: string;
  size?: number;
  className?: string;
};

/**
 * Team logo that gracefully falls back to a tricode badge if the CDN fetch
 * fails (network issue, CDN outage, unknown team, etc.). Client component
 * only because we need the onError hook — the rest of the bracket page is
 * server-rendered.
 */
export default function TeamLogo({ team, size = 40, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const url = getTeamLogoUrl(team);
  const tricode = getTeamTricode(team);

  if (!url || failed) {
    return (
      <span
        aria-label={team}
        role="img"
        className={`inline-flex items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold tracking-wide text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 ${className}`}
        style={{ width: size, height: size }}
      >
        {tricode}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={team}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-contain ${className}`}
    />
  );
}
