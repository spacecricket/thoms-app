import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { joinLeague } from "@/lib/omnipong-joiner";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const { leagueName, leagueDate } = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const message of joinLeague(leagueName, leagueDate)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ message })}\n\n`),
          );
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
        );
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: String(err) })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
