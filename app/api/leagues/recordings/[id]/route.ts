import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { nextServer } from "@/lib/live-match";
import type { Player } from "@/lib/live-match";

export const dynamic = "force-dynamic";

function buildState(match: {
  firstServer: string;
  curSetNumber: number;
  curThomSetScore: number;
  curOppSetScore: number;
  curThomSetsWon: number;
  curOppSetsWon: number;
  curMatchComplete: boolean;
}) {
  const nextSrv = match.curMatchComplete
    ? null
    : nextServer(
        match.firstServer as Player,
        match.curSetNumber,
        match.curThomSetScore,
        match.curOppSetScore,
        false,
      );
  return {
    setNumber: match.curSetNumber,
    thomSetScore: match.curThomSetScore,
    oppSetScore: match.curOppSetScore,
    thomSetsWon: match.curThomSetsWon,
    oppSetsWon: match.curOppSetsWon,
    nextServer: nextSrv,
    matchComplete: match.curMatchComplete,
  };
}

/** GET /api/league/admin/live/[id] — full match state with all points */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const match = await prisma.liveMatch.findUnique({
    where: { id },
    include: {
      points: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    match: {
      id: match.id,
      createdAt: match.createdAt,
      matchDate: match.matchDate,
      opponentName: match.opponentName,
      opponentUsattId: match.opponentUsattId,
      thomSide: match.thomSide,
      tossWinner: match.tossWinner,
      firstServer: match.firstServer,
      status: match.status,
      linkedMatchId: match.linkedMatchId,
    },
    state: buildState(match),
    points: match.points,
  });
}

/** PATCH /api/league/admin/live/[id] — update match metadata */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = (await request.json()) as {
    linkedMatchId?: number;
    status?: string;
    opponentUsattId?: string;
  };

  const match = await prisma.liveMatch.update({
    where: { id },
    data: {
      ...(body.linkedMatchId !== undefined && { linkedMatchId: body.linkedMatchId }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.opponentUsattId !== undefined && {
        opponentUsattId: body.opponentUsattId || null,
      }),
    },
  });

  return NextResponse.json({ match });
}

/** DELETE /api/league/admin/live/[id] — delete entire match */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  await prisma.liveMatch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
