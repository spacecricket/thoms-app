import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/league/match/[matchId]/play-by-play
 *
 * Public (no auth) endpoint — returns the LiveMatch linked to a JustGo
 * Match.id, including all points, for the public play-by-play viewer.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: matchId } = await params;
  const matchIdInt = parseInt(matchId, 10);
  if (isNaN(matchIdInt)) {
    return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });
  }

  const live = await prisma.liveMatch.findFirst({
    where: { linkedMatchId: matchIdInt },
    include: { points: { orderBy: { createdAt: "asc" } } },
  });

  if (!live) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    match: {
      id: live.id,
      opponentName: live.opponentName,
      matchDate: live.matchDate,
      firstServer: live.firstServer,
      status: live.status,
    },
    state: {
      thomSetsWon: live.curThomSetsWon,
      oppSetsWon: live.curOppSetsWon,
      matchComplete: live.curMatchComplete,
    },
    points: live.points,
  });
}
