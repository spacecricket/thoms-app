import { NextRequest, NextResponse } from "next/server";
import { predictTournamentRatingsCached, tournamentIdFromInput } from "@/lib/tournament-ratings";

export const dynamic = "force-dynamic";
// A cold run fetches one page per player (119 at SPTTC events), so give it room.
export const maxDuration = 300;

/**
 * GET /api/tournament-rating-predictor?url=https://omnipong.com/T-tourney.asp?t=100&r=6328
 * GET /api/tournament-rating-predictor?r=6328
 *
 * Recalculates every player's USATT rating for an OmniPong tournament from the
 * per-player win/loss pages. `url` accepts the tournament page a user would
 * paste; `r` / `tournamentId` accept the bare id.
 *
 * The data is public and read-only, so this endpoint does not require admin auth.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const raw = params.get("url") ?? params.get("r") ?? params.get("tournamentId") ?? "";
  const id = tournamentIdFromInput(raw);

  if (!id) {
    return NextResponse.json(
      {
        error:
          "Pass an OmniPong tournament page URL or id, e.g. " +
          "?url=https://omnipong.com/T-tourney.asp?t=100&r=6328 or ?r=6328",
      },
      { status: 400 },
    );
  }

  try {
    const { data, cached } = await predictTournamentRatingsCached(id);
    return NextResponse.json({ ...data, cached });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Tournament rating prediction failed for ${id}:`, message);
    return NextResponse.json(
      { error: `Failed to predict ratings for tournament ${id}: ${message}` },
      { status: 502 },
    );
  }
}
