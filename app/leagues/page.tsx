import { getAnalysis } from "@/lib/analysis";
import { LeagueDashboard } from "@/components/league/league-dashboard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Thom's Leagues",
  description: "USATT league rating history and head-to-head records",
};

export default async function LeaguePage() {
  const data = await getAnalysis();

  if (data.ratingTimeline.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          No data imported yet
        </h1>
        <p className="mt-3 text-gray-500">
          Go to the{" "}
          <Link href="/leagues/import" className="text-blue-600 underline">
            import page
          </Link>{" "}
          to import league events.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-10">
      <LeagueDashboard data={data} />
    </div>
  );
}
