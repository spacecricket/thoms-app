import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { scrapeEventDetail, fetchRenderedText } from "@/lib/scraper";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WEBLET_BASE =
  "https://justgousatt2-dpedf8b3ekgef0fh.centralus-01.azurewebsites.net" +
  "/weblets/load/Result/b11c2cb7-130d-4274-bf68-ca7b5ffb19ac" +
  "/FA4D9651-1327-40DF-BFB9-7A6768AD4931";

const PLAYER_ID = "7E78D830-53B2-42E8-BB70-6C2A0CE298C2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("raw") === "1";

  try {
    if (raw) {
      const url = `${WEBLET_BASE}/player-profile/${PLAYER_ID}/profile-matche-history/${id}?tab=league`;
      const text = await fetchRenderedText(url);
      return new NextResponse(text, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const detail = await scrapeEventDetail(id);
    return NextResponse.json(detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Preview failed for event ${id}:`, message);
    return NextResponse.json(
      { error: `Failed to preview event ${id}: ${message}` },
      { status: 500 },
    );
  }
}
