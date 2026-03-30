import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { scrapeEventDetail } from "@/lib/scraper";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;

  try {
    const detail = await scrapeEventDetail(id);
    return NextResponse.json(detail);
  } catch (error) {
    console.error(`Preview failed for event ${id}:`, error);
    return NextResponse.json(
      { error: `Failed to preview event ${id}` },
      { status: 500 },
    );
  }
}
