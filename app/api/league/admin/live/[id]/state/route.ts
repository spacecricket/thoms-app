import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { nextServer } from "@/lib/live-match";
import type { Player } from "@/lib/live-match";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/league/admin/live/[id]/state
 *
 * Directly override the current match state — used for manual score
 * adjustments (e.g. when the user missed a set or a run of points).
 *
 * Body (all optional — only send what you want to change):
 * {
 *   setNumber?: number
 *   thomSetScore?: number
 *   oppSetScore?: number
 *   thomSetsWon?: number
 *   oppSetsWon?: number
 * }
 *
 * matchComplete is derived automatically from setsWon.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = (await request.json()) as {
    setNumber?: number;
    thomSetScore?: number;
    oppSetScore?: number;
    thomSetsWon?: number;
    oppSetsWon?: number;
  };

  const match = await prisma.liveMatch.findUnique({ where: { id } });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newThomSets =
    body.thomSetsWon !== undefined
      ? Math.max(0, Math.min(3, body.thomSetsWon))
      : match.curThomSetsWon;
  const newOppSets =
    body.oppSetsWon !== undefined
      ? Math.max(0, Math.min(3, body.oppSetsWon))
      : match.curOppSetsWon;
  const matchComplete = newThomSets >= 3 || newOppSets >= 3;

  const newSetNumber =
    body.setNumber !== undefined
      ? Math.max(1, Math.min(5, body.setNumber))
      : match.curSetNumber;
  const newThomSetScore =
    body.thomSetScore !== undefined
      ? Math.max(0, body.thomSetScore)
      : match.curThomSetScore;
  const newOppSetScore =
    body.oppSetScore !== undefined
      ? Math.max(0, body.oppSetScore)
      : match.curOppSetScore;

  const updated = await prisma.liveMatch.update({
    where: { id },
    data: {
      curSetNumber: newSetNumber,
      curThomSetScore: newThomSetScore,
      curOppSetScore: newOppSetScore,
      curThomSetsWon: newThomSets,
      curOppSetsWon: newOppSets,
      curMatchComplete: matchComplete,
      status: matchComplete ? "complete" : "active",
    },
  });

  const nextSrv = matchComplete
    ? null
    : nextServer(
        updated.firstServer as Player,
        updated.curSetNumber,
        updated.curThomSetScore,
        updated.curOppSetScore,
        false,
      );

  return NextResponse.json({
    state: {
      setNumber: updated.curSetNumber,
      thomSetScore: updated.curThomSetScore,
      oppSetScore: updated.curOppSetScore,
      thomSetsWon: updated.curThomSetsWon,
      oppSetsWon: updated.curOppSetsWon,
      nextServer: nextSrv,
      matchComplete,
    },
  });
}
