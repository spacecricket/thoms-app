import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { scrapeEventsList } from "@/lib/scraper";
import { getImportedIds } from "@/lib/analysis";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const importedIds = await getImportedIds();
    const events = await scrapeEventsList(importedIds);

    const { searchParams } = new URL(request.url);
    const nameFilter = searchParams.get("name");
    const dateFilter = searchParams.get("date");

    let filtered = events;
    if (nameFilter) {
      const lc = nameFilter.toLowerCase();
      filtered = filtered.filter((e) => e.name.toLowerCase().includes(lc));
    }
    if (dateFilter) {
      filtered = filtered.filter((e) => e.date === dateFilter);
    }

    return NextResponse.json({ events: filtered });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Scrape failed:", message);
    return NextResponse.json(
      { error: `Failed to scrape events list: ${message}` },
      { status: 500 },
    );
  }
}
