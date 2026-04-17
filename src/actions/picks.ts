"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { SubmitPickInput } from "@/lib/zod-schemas";

export type PickActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitPick(
  formData: FormData,
): Promise<PickActionResult> {
  const user = await requireUser();

  const parsed = SubmitPickInput.safeParse({
    seriesId: formData.get("seriesId"),
    pickedTeam: formData.get("pickedTeam"),
    pickedGames: Number(formData.get("pickedGames") ?? NaN),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { seriesId, pickedTeam, pickedGames } = parsed.data;

  const series = await prisma.series.findUnique({ where: { id: seriesId } });
  if (!series) return { ok: false, error: "Series not found" };

  if (pickedTeam !== series.teamA && pickedTeam !== series.teamB) {
    return { ok: false, error: "Picked team is not in this series" };
  }

  if (series.lockTime.getTime() <= Date.now()) {
    return { ok: false, error: "Picks for this series are locked" };
  }

  await prisma.pick.upsert({
    where: { userId_seriesId: { userId: user.id, seriesId } },
    update: { pickedTeam, pickedGames },
    create: { userId: user.id, seriesId, pickedTeam, pickedGames },
  });

  revalidatePath("/");
  revalidatePath(`/series/${seriesId}`);
  revalidatePath("/leaderboard");
  return { ok: true };
}
