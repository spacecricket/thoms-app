import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/league/admin/opponents — list all known opponents for autocomplete */
export async function GET(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const opponents = await prisma.opponent.findMany({
    orderBy: { name: "asc" },
    select: { usattId: true, name: true },
  });

  return NextResponse.json({ opponents });
}
