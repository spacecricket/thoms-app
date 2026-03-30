import { NextRequest, NextResponse } from "next/server";

export function requireAdmin(request: NextRequest): NextResponse | null {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !token || token !== password) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
