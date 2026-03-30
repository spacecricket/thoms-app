import { getAnalysis } from "@/lib/analysis";
import { StatsRow } from "@/components/league/stats-row";
import { RatingChart } from "@/components/league/rating-chart";
import { HeadToHeadTable } from "@/components/league/head-to-head-table";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Thom Sonavane — League Analysis",
  description: "USATT league rating history and head-to-head records",
};

export default async function LeaguePage() {
  const data = await getAnalysis();

  if (data.ratingTimeline.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-100">
          No data imported yet
        </h1>
        <p className="mt-3 text-slate-400">
          Go to the{" "}
          <Link href="/league/admin" className="text-blue-400 underline">
            admin page
          </Link>{" "}
          to import league events.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">
          Thom Sonavane — League Analysis
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          USATT# {data.player.usattId} · League Rating:{" "}
          <strong className="text-slate-200">
            {data.player.currentRating}
          </strong>{" "}
          · {data.player.totalEvents} events · {data.player.totalMatches}{" "}
          matches
        </p>
      </div>

      <StatsRow player={data.player} />
      <RatingChart timeline={data.ratingTimeline} />
      <HeadToHeadTable rows={data.headToHead} />
    </div>
  );
}
