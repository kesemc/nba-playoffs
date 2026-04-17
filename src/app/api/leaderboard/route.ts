import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { computeLeaderboard } from "@/lib/series-queries";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await computeLeaderboard();
  return NextResponse.json({ rows, computedAt: new Date().toISOString() });
}
