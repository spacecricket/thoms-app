import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { applyPoint, nextServer, isMatchOver } from "@/lib/live-match";
import type { Player } from "@/lib/live-match";

export const dynamic = "force-dynamic";

/** Compute what state to write onto LiveMatch from the last point (or defaults if no points). */
function stateFromPoint(
  p: {
    setNumber: number;
    setComplete: boolean;
    thomSetScore: number;
    oppSetScore: number;
    thomSetsWon: number;
    oppSetsWon: number;
    matchComplete: boolean;
  } | null,
): {
  curSetNumber: number;
  curThomSetScore: number;
  curOppSetScore: number;
  curThomSetsWon: number;
  curOppSetsWon: number;
  curMatchComplete: boolean;
} {
  if (!p) {
    return {
      curSetNumber: 1,
      curThomSetScore: 0,
      curOppSetScore: 0,
      curThomSetsWon: 0,
      curOppSetsWon: 0,
      curMatchComplete: false,
    };
  }
  return {
    curSetNumber: p.setComplete ? p.setNumber + 1 : p.setNumber,
    curThomSetScore: p.setComplete ? 0 : p.thomSetScore,
    curOppSetScore: p.setComplete ? 0 : p.oppSetScore,
    curThomSetsWon: p.thomSetsWon,
    curOppSetsWon: p.oppSetsWon,
    curMatchComplete: p.matchComplete,
  };
}

/**
 * POST /api/league/admin/live/[id]/point
 *
 * Record a new point. All shot detail is optional and can be included
 * in a single request — no need for a separate PATCH.
 *
 * Body: {
 *   winner: "thom" | "opponent"
 *   shotType?: string   e.g. "loop" | "push" | "chop" | "smash" | "flick" | "block" | "drive" | "lob"
 *   shotBy?:  "thom" | "opponent"
 *   pointType?: "winner" | "error"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = (await request.json()) as {
    winner: Player;
    shotType?: string;
    shotBy?: Player;
    pointType?: string;
    backhand?: boolean | null;
  };

  if (body.winner !== "thom" && body.winner !== "opponent") {
    return NextResponse.json(
      { error: "winner must be thom or opponent" },
      { status: 400 },
    );
  }

  const match = await prisma.liveMatch.findUnique({ where: { id } });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (match.curMatchComplete) {
    return NextResponse.json(
      { error: "Match is already complete" },
      { status: 400 },
    );
  }

  if (isMatchOver(match.curThomSetsWon, match.curOppSetsWon)) {
    return NextResponse.json(
      { error: "Match is already complete" },
      { status: 400 },
    );
  }

  // Count points in current set for pointInSet
  const pointsInCurrentSet = await prisma.livePoint.count({
    where: { liveMatchId: id, setNumber: match.curSetNumber },
  });
  const pointInSet = pointsInCurrentSet + 1;

  const result = applyPoint(
    match.firstServer as Player,
    body.winner,
    match.curSetNumber,
    match.curThomSetScore,
    match.curOppSetScore,
    match.curThomSetsWon,
    match.curOppSetsWon,
    pointInSet,
  );

  const newCur = {
    curSetNumber: result.setComplete ? result.setNumber + 1 : result.setNumber,
    curThomSetScore: result.setComplete ? 0 : result.thomSetScore,
    curOppSetScore: result.setComplete ? 0 : result.oppSetScore,
    curThomSetsWon: result.thomSetsWon,
    curOppSetsWon: result.oppSetsWon,
    curMatchComplete: result.matchComplete,
  };

  // Persist point + update LiveMatch state atomically
  const [point] = await prisma.$transaction([
    prisma.livePoint.create({
      data: {
        liveMatchId: id,
        setNumber: result.setNumber,
        pointInSet,
        serverThom: result.serverThom,
        thomWon: body.winner === "thom",
        thomSetScore: result.thomSetScore,
        oppSetScore: result.oppSetScore,
        thomSetsWon: result.thomSetsWon,
        oppSetsWon: result.oppSetsWon,
        setComplete: result.setComplete,
        matchComplete: result.matchComplete,
        shotType: body.shotType || null,
        shotBy: body.shotBy || null,
        pointType: body.pointType || null,
        backhand: body.backhand ?? null,
      },
    }),
    prisma.liveMatch.update({
      where: { id },
      data: {
        ...newCur,
        status: result.matchComplete ? "complete" : "active",
      },
    }),
  ]);

  const nextSrv = result.matchComplete
    ? null
    : nextServer(
        match.firstServer as Player,
        newCur.curSetNumber,
        newCur.curThomSetScore,
        newCur.curOppSetScore,
        false,
      );

  return NextResponse.json({
    point,
    state: {
      setNumber: newCur.curSetNumber,
      thomSetScore: newCur.curThomSetScore,
      oppSetScore: newCur.curOppSetScore,
      thomSetsWon: newCur.curThomSetsWon,
      oppSetsWon: newCur.curOppSetsWon,
      nextServer: nextSrv,
      matchComplete: result.matchComplete,
      setJustCompleted: result.setComplete,
    },
  });
}

/**
 * DELETE /api/league/admin/live/[id]/point
 * Undo the most recent point and restore LiveMatch cur* state.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;

  const match = await prisma.liveMatch.findUnique({ where: { id } });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const last = await prisma.livePoint.findFirst({
    where: { liveMatchId: id },
    orderBy: { createdAt: "desc" },
  });
  if (!last) {
    return NextResponse.json({ error: "No points to undo" }, { status: 400 });
  }

  // Delete and find new last
  await prisma.livePoint.delete({ where: { id: last.id } });

  const newLast = await prisma.livePoint.findFirst({
    where: { liveMatchId: id },
    orderBy: { createdAt: "desc" },
  });

  const newCur = stateFromPoint(newLast);

  await prisma.liveMatch.update({
    where: { id },
    data: {
      ...newCur,
      status: newCur.curMatchComplete ? "complete" : "active",
    },
  });

  const nextSrv = newCur.curMatchComplete
    ? null
    : nextServer(
        match.firstServer as Player,
        newCur.curSetNumber,
        newCur.curThomSetScore,
        newCur.curOppSetScore,
        false,
      );

  return NextResponse.json({
    state: {
      setNumber: newCur.curSetNumber,
      thomSetScore: newCur.curThomSetScore,
      oppSetScore: newCur.curOppSetScore,
      thomSetsWon: newCur.curThomSetsWon,
      oppSetsWon: newCur.curOppSetsWon,
      nextServer: nextSrv,
      matchComplete: newCur.curMatchComplete,
    },
  });
}

/**
 * PATCH /api/league/admin/live/[id]/point
 * Update shot detail on the most recent point (kept for completeness).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const body = (await request.json()) as {
    shotType?: string;
    shotBy?: string;
    pointType?: string;
    backhand?: boolean | null;
  };

  const last = await prisma.livePoint.findFirst({
    where: { liveMatchId: id },
    orderBy: { createdAt: "desc" },
  });
  if (!last) {
    return NextResponse.json({ error: "No points to update" }, { status: 400 });
  }

  const point = await prisma.livePoint.update({
    where: { id: last.id },
    data: {
      ...(body.shotType !== undefined && { shotType: body.shotType || null }),
      ...(body.shotBy !== undefined && { shotBy: body.shotBy || null }),
      ...(body.pointType !== undefined && { pointType: body.pointType || null }),
      ...(body.backhand !== undefined && { backhand: body.backhand ?? null }),
    },
  });

  return NextResponse.json({ point });
}
