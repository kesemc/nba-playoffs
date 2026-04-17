"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  CreateSeriesInput,
  EnterResultInput,
  UpdateSeriesInput,
  type OddsGrid,
} from "@/lib/zod-schemas";
import type { Prisma } from "@prisma/client";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function oddsRowsFor(
  seriesId: string,
  teamA: string,
  teamB: string,
  g: OddsGrid,
): Prisma.SeriesOddsCreateManyInput[] {
  // Only winner-only rows (games = null) are written under the current
  // scoring rule. Exact-games rows remain supported by the schema for
  // possible future use but are not persisted today.
  return [
    { seriesId, team: teamA, games: null, odds: g.winnerA },
    { seriesId, team: teamB, games: null, odds: g.winnerB },
  ];
}

function parseOddsGridFromForm(formData: FormData): OddsGrid {
  const n = (k: string) => Number(formData.get(k) ?? NaN);
  return {
    winnerA: n("winnerA"),
    winnerB: n("winnerB"),
  };
}

export async function createSeries(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = CreateSeriesInput.safeParse({
    round: formData.get("round"),
    teamA: formData.get("teamA"),
    teamB: formData.get("teamB"),
    lockTime: formData.get("lockTime"),
    odds: parseOddsGridFromForm(formData),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { round, teamA, teamB, lockTime, odds } = parsed.data;

  const series = await prisma.$transaction(async (tx) => {
    const s = await tx.series.create({
      data: { round, teamA, teamB, lockTime },
    });
    await tx.seriesOdds.createMany({
      data: oddsRowsFor(s.id, teamA, teamB, odds),
    });
    return s;
  });

  revalidatePath("/");
  revalidatePath("/admin/series");
  return { ok: true, data: { id: series.id } };
}

export async function updateSeries(
  formData: FormData,
): Promise<ActionResult<null>> {
  await requireAdmin();

  const rawLockTime = formData.get("lockTime");
  const parsed = UpdateSeriesInput.safeParse({
    seriesId: formData.get("seriesId"),
    odds: parseOddsGridFromForm(formData),
    // Only forward lockTime if the client sent it; otherwise leave undefined
    // so the schema treats it as "no change".
    lockTime: rawLockTime && String(rawLockTime).length > 0 ? rawLockTime : undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const series = await prisma.series.findUnique({
    where: { id: parsed.data.seriesId },
  });
  if (!series) return { ok: false, error: "Series not found" };

  await prisma.$transaction(async (tx) => {
    if (parsed.data.lockTime) {
      await tx.series.update({
        where: { id: series.id },
        data: { lockTime: parsed.data.lockTime },
      });
    }
    await tx.seriesOdds.deleteMany({ where: { seriesId: series.id } });
    await tx.seriesOdds.createMany({
      data: oddsRowsFor(series.id, series.teamA, series.teamB, parsed.data.odds),
    });
  });

  revalidatePath("/");
  revalidatePath(`/series/${series.id}`);
  revalidatePath(`/admin/series/${series.id}`);
  return { ok: true, data: null };
}

export async function enterSeriesResult(
  formData: FormData,
): Promise<ActionResult<null>> {
  const admin = await requireAdmin();

  const parsed = EnterResultInput.safeParse({
    seriesId: formData.get("seriesId"),
    winner: formData.get("winner"),
    games: Number(formData.get("games") ?? NaN),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { seriesId, winner, games } = parsed.data;

  const series = await prisma.series.findUnique({ where: { id: seriesId } });
  if (!series) return { ok: false, error: "Series not found" };
  if (winner !== series.teamA && winner !== series.teamB) {
    return { ok: false, error: "Winner must be one of the two teams in this series" };
  }

  await prisma.seriesResult.upsert({
    where: { seriesId },
    update: { winner, games, enteredBy: admin.id },
    create: { seriesId, winner, games, enteredBy: admin.id },
  });

  revalidatePath("/");
  revalidatePath(`/series/${seriesId}`);
  revalidatePath(`/admin/series/${seriesId}`);
  revalidatePath("/leaderboard");
  return { ok: true, data: null };
}

export async function deleteSeries(
  formData: FormData,
): Promise<ActionResult<null>> {
  await requireAdmin();
  const seriesId = String(formData.get("seriesId") ?? "");
  if (!seriesId) return { ok: false, error: "Missing seriesId" };

  const series = await prisma.series.findUnique({ where: { id: seriesId } });
  if (!series) return { ok: false, error: "Series not found" };

  // The schema has onDelete: Cascade on SeriesOdds, Pick, and SeriesResult,
  // so a single delete takes everything down together.
  await prisma.series.delete({ where: { id: seriesId } });

  revalidatePath("/");
  revalidatePath("/admin/series");
  revalidatePath("/leaderboard");
  return { ok: true, data: null };
}

export async function clearSeriesResult(
  formData: FormData,
): Promise<ActionResult<null>> {
  await requireAdmin();
  const seriesId = String(formData.get("seriesId") ?? "");
  if (!seriesId) return { ok: false, error: "Missing seriesId" };

  await prisma.seriesResult.deleteMany({ where: { seriesId } });

  revalidatePath("/");
  revalidatePath(`/series/${seriesId}`);
  revalidatePath(`/admin/series/${seriesId}`);
  revalidatePath("/leaderboard");
  return { ok: true, data: null };
}
