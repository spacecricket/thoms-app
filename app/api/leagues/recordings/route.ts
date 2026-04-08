import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/league/admin/live — list live matches (newest first)
 * Optional query param: ?date=YYYY-MM-DD  filters to matches whose matchDate
 * falls within ±1 day of the given date (handles timezone edge cases).
 */
export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const dateParam = new URL(request.url).searchParams.get("date");

  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (dateParam) {
    const base = new Date(`${dateParam}T00:00:00.000Z`);
    const prev = new Date(base); prev.setUTCDate(prev.getUTCDate() - 1);
    const next = new Date(base); next.setUTCDate(next.getUTCDate() + 2);
    dateFilter = { gte: prev, lt: next };
  }

  const matches = await prisma.liveMatch.findMany({
    where: dateFilter ? { matchDate: dateFilter } : undefined,
    orderBy: { createdAt: "desc" },
  });

  const result = matches.map((m) => ({
    id: m.id,
    createdAt: m.createdAt,
    matchDate: m.matchDate,
    opponentName: m.opponentName,
    opponentUsattId: m.opponentUsattId,
    status: m.status,
    linkedMatchId: m.linkedMatchId,
    thomSetsWon: m.curThomSetsWon,
    oppSetsWon: m.curOppSetsWon,
  }));

  return NextResponse.json({ matches: result });
}

/** POST /api/league/admin/live — create a new live match */
export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const body = (await request.json()) as {
    opponentName: string;
    opponentUsattId?: string;
    thomSide: "left" | "right";
    tossWinner: "thom" | "opponent";
    firstServer: "thom" | "opponent";
    matchDate: string; // ISO date string, e.g. "2026-04-07"
  };

  if (!body.opponentName?.trim()) {
    return NextResponse.json(
      { error: "opponentName is required" },
      { status: 400 },
    );
  }

  // Parse the date; fall back to today if missing/invalid
  const parsedDate = body.matchDate ? new Date(body.matchDate) : new Date();
  const matchDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const match = await prisma.liveMatch.create({
    data: {
      opponentName: body.opponentName.trim(),
      opponentUsattId: body.opponentUsattId?.trim() || null,
      thomSide: body.thomSide,
      tossWinner: body.tossWinner,
      firstServer: body.firstServer,
      matchDate,
    },
  });

  return NextResponse.json({ match });
}
