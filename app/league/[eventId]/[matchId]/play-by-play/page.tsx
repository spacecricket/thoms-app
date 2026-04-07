import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PlayByPlayView } from "@/components/league/play-by-play-view";

interface Props {
  params: Promise<{ eventId: string; matchId: string }>;
}

export const dynamic = "force-dynamic";

export default async function PlayByPlayPage({ params }: Props) {
  const { eventId, matchId } = await params;

  const matchIdInt = parseInt(matchId, 10);
  if (isNaN(matchIdInt)) notFound();

  const live = await prisma.liveMatch.findFirst({
    where: { linkedMatchId: matchIdInt },
    include: { points: { orderBy: { createdAt: "asc" } } },
  });

  if (!live) notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link
          href="/league"
          className="mb-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          ← Back to League
        </Link>
        <PlayByPlayView
          match={{
            opponentName: live.opponentName,
            matchDate: live.matchDate.toISOString(),
            firstServer: live.firstServer,
            status: live.status,
          }}
          state={{
            thomSetsWon: live.curThomSetsWon,
            oppSetsWon: live.curOppSetsWon,
            matchComplete: live.curMatchComplete,
          }}
          points={live.points}
        />
      </div>
    </div>
  );
}
