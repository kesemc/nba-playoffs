"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  CreateSeriesInput,
  EnterResultInput,
  UpdateSeriesOddsInput,
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
  return [
    { seriesId, team: teamA, games: null, odds: g.winnerA },
    { seriesId, team: teamA, games: 4, odds: g.a4 },
    { seriesId, team: teamA, games: 5, odds: g.a5 },
    { seriesId, team: teamA, games: 6, odds: g.a6 },
    { seriesId, team: teamA, games: 7, odds: g.a7 },
    { seriesId, team: teamB, games: null, odds: g.winnerB },
    { seriesId, team: teamB, games: 4, odds: g.b4 },
    { seriesId, team: teamB, games: 5, odds: g.b5 },
    { seriesId, team: teamB, games: 6, odds: g.b6 },
    { seriesId, team: teamB, games: 7, odds: g.b7 },
  ];
}

function parseOddsGridFromForm(formData: FormData): OddsGrid {
  const n = (k: string) => Number(formData.get(k) ?? NaN);
  return {
    winnerA: n("winnerA"),
    winnerB: n("winnerB"),
    a4: n("a4"),
    a5: n("a5"),
    a6: n("a6"),
    a7: n("a7"),
    b4: n("b4"),
    b5: n("b5"),
    b6: n("b6"),
    b7: n("b7"),
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

export async function updateSeriesOdds(
  formData: FormData,
): Promise<ActionResult<null>> {
  await requireAdmin();

  const parsed = UpdateSeriesOddsInput.safeParse({
    seriesId: formData.get("seriesId"),
    odds: parseOddsGridFromForm(formData),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const series = await prisma.series.findUnique({
    where: { id: parsed.data.seriesId },
  });
  if (!series) return { ok: false, error: "Series not found" };

  await prisma.$transaction(async (tx) => {
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
