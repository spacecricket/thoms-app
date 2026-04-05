import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { scrapeEventDetail } from "@/lib/scraper";
import { upsertEvent } from "@/lib/analysis";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    const detail = await scrapeEventDetail(id);
    const matchesImported = await upsertEvent(detail);
    return NextResponse.json({
      eventId: id,
      matchesImported,
      event: {
        id: detail.id,
        name: detail.name,
        date: detail.date,
        ratingBefore: detail.ratingBefore,
        ratingAfter: detail.ratingAfter,
        won: detail.won,
        lost: detail.lost,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Re-import failed for event ${id}:`, message);
    return NextResponse.json(
      { error: `Failed to re-import event ${id}: ${message}` },
      { status: 500 },
    );
  }
}
