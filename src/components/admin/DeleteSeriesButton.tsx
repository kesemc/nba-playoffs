"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSeries } from "@/actions/series";

type Props = {
  seriesId: string;
  label: string;
  /**
   * Extra context shown in the confirm dialog, e.g. "Celtics vs Heat".
   */
  matchup: string;
  pickCount: number;
  hasResult: boolean;
  className?: string;
  /**
   * When provided, redirect here after a successful delete. If omitted, just
   * refreshes the current route (useful when the list page stays mounted).
   */
  redirectTo?: string;
};

export default function DeleteSeriesButton({
  seriesId,
  label,
  matchup,
  pickCount,
  hasResult,
  className,
  redirectTo,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    const extras: string[] = [];
    if (pickCount > 0) extras.push(`${pickCount} pick${pickCount === 1 ? "" : "s"}`);
    if (hasResult) extras.push("the entered result");
    const extrasText = extras.length
      ? `\n\nThis will also remove ${extras.join(" and ")}.`
      : "";

    const confirmed = window.confirm(
      `Delete series "${matchup}"?${extrasText}\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("seriesId", seriesId);
      const res = await deleteSeries(fd);
      if (!res.ok) {
        window.alert(`Failed to delete: ${res.error}`);
        return;
      }
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={
        className ??
        "text-xs font-medium text-red-600 hover:underline underline-offset-2 disabled:opacity-50 dark:text-red-400"
      }
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}
