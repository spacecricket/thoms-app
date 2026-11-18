import { notFound } from "next/navigation";
import {
  predictTournamentRatingsCached,
  tournamentIdFromInput,
  type TournamentRatings,
} from "@/lib/tournament-ratings";
import { TournamentRatingPredictor } from "@/components/tournament-rating-predictor";

export const metadata = {
  title: "Tournament Rating Predictor",
  description: "Predict USATT ratings for every player in an OmniPong tournament",
};

// A cold run fetches one results page per player.
export const maxDuration = 300;

export default async function TournamentRatingPredictorPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string | string[] }>;
}) {
  // Local-only tool (see the matching check in the API route).
  if (process.env.NODE_ENV === "production") notFound();

  const { url } = await searchParams;
  const initialUrl = (Array.isArray(url) ? url[0] : url)?.trim() ?? "";

  // Resolve ?url= on the server so shared links render a full table with no JS round-trip.
  let initialData: TournamentRatings | null = null;
  let initialError: string | null = null;

  if (initialUrl) {
    const id = tournamentIdFromInput(initialUrl);
    if (!id) {
      initialError =
        "That doesn't look like an OmniPong tournament page. Paste a URL containing r=<id>, " +
        "e.g. https://omnipong.com/T-tourney.asp?t=100&r=6328";
    } else {
      try {
        initialData = (await predictTournamentRatingsCached(id)).data;
      } catch (error) {
        initialError = error instanceof Error ? error.message : String(error);
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tournament rating predictor</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Paste an OmniPong tournament page to recalculate every player&apos;s USATT rating from
          their singles results: points-exchange chart, pass 1 adjustments, initial ratings for
          unrated players, then the final pass.
        </p>
      </div>
      <TournamentRatingPredictor
        initialUrl={initialUrl}
        initialData={initialData}
        initialError={initialError}
      />
    </div>
  );
}
