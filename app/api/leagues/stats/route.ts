import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/analysis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAnalysis();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis" },
      { status: 500 },
    );
  }
}
