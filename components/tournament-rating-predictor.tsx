"use client";

import { useCallback, useMemo, useState } from "react";
import type { TournamentRatings } from "@/lib/tournament-ratings";

type ApiResponse = TournamentRatings & { cached?: boolean };
type SortKey = "name" | "initial" | "final" | "change";

const SAMPLE_URL = "https://omnipong.com/T-tourney.asp?t=100&r=6328";

export function TournamentRatingPredictor({
  initialUrl = "",
  initialData = null,
  initialError = null,
}: {
  initialUrl?: string;
  initialData?: TournamentRatings | null;
  initialError?: string | null;
}) {
  const [input, setInput] = useState(initialUrl);
  const [data, setData] = useState<ApiResponse | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDesc, setSortDesc] = useState(false);

  const run = useCallback(async (value: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournament-rating-predictor?url=${encodeURIComponent(value)}`);
      const body = (await res.json().catch(() => ({}))) as ApiResponse & { error?: string };
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      setData(body);

      const next = new URL(window.location.href);
      next.searchParams.set("url", value);
      window.history.replaceState(null, "", next);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // The initial URL is resolved by the server component; the browser only fetches
  // when the user submits another tournament.

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(key !== "name");
    }
  }

  const rows = useMemo(() => {
    if (!data) return [];
    const dir = sortDesc ? -1 : 1;
    return [...data.players].sort((a, b) => {
      if (sortKey === "name") return dir * a.name.localeCompare(b.name);
      const pick = (p: (typeof a)) =>
        sortKey === "initial" ? p.initialRating : sortKey === "final" ? p.finalRating : p.ratingChange;
      const av = pick(a);
      const bv = pick(b);
      // Players who could not be rated stay at the bottom either way.
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return dir * (av - bv);
    });
  }, [data, sortKey, sortDesc]);

  const arrow = (key: SortKey) => (sortKey === key ? (sortDesc ? " ↓" : " ↑") : "");

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = input.trim();
          if (value) void run(value);
        }}
        className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
      >
        <label htmlFor="omnipong-url" className="block text-sm font-semibold text-gray-900">
          OmniPong tournament page
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Paste the page you get from &ldquo;Players by Name&rdquo; — or any tournament page with an{" "}
          <code className="rounded bg-gray-100 px-1">r=</code> parameter. A bare id works too.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="omnipong-url"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={SAMPLE_URL}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading || input.trim() === ""}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
          >
            {loading ? "Calculating…" : "Predict"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setInput(SAMPLE_URL);
            void run(SAMPLE_URL);
          }}
          disabled={loading}
          className="mt-2 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-40"
        >
          Use example: 2026 Butterfly SPTTC November Open
        </button>
      </form>

      {loading && (
        <p className="text-sm text-gray-500">
          Fetching one results page per player and running the USATT passes… this takes a few
          seconds for a 100+ player event.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold text-gray-900">{data.tournament.name}</h2>
            <span className="text-xs text-gray-400">r={data.tournament.id}</span>
          </div>
          <p className="text-xs text-gray-500">
            {data.summary.players} players · {data.summary.matches} matches ·{" "}
            {data.summary.adjusted} adjusted · {data.summary.unrated} unrated
            {data.summary.unresolved > 0 && ` · ${data.summary.unresolved} unrateable`}
            {data.cached ? " · cached" : ""}
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="cursor-pointer px-3 py-2" onClick={() => handleSort("name")}>
                    Player{arrow("name")}
                  </th>
                  <th
                    className="w-20 cursor-pointer px-3 py-2 text-right"
                    onClick={() => handleSort("initial")}
                  >
                    Initial{arrow("initial")}
                  </th>
                  <th className="w-12 px-2 py-2 text-right">W</th>
                  <th className="w-12 px-2 py-2 text-right">L</th>
                  <th
                    className="w-32 px-3 py-2 text-right"
                    title="Starting rating for the final pass (adjusted when granted)"
                  >
                    Adjusted
                  </th>
                  <th
                    className="w-20 cursor-pointer px-3 py-2 text-right"
                    onClick={() => handleSort("final")}
                  >
                    Final{arrow("final")}
                  </th>
                  <th
                    className="w-20 cursor-pointer px-3 py-2 text-right"
                    onClick={() => handleSort("change")}
                  >
                    Change{arrow("change")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const change = row.ratingChange;
                  return (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {row.name}
                        {row.uncertain && (
                          <span
                            className="ml-1 cursor-help text-amber-500"
                            title={
                              row.notes.length > 0
                                ? row.notes.join("\n")
                                : "Includes an inferred rating (unrated player or opponent)"
                            }
                          >
                            *
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                        {row.initialRating > 0 ? row.initialRating : "NR"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{row.wins}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{row.losses}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          {row.adjustedRating ?? "—"}
                          {row.adjustment === "standard" && <Badge tone="blue">std</Badge>}
                          {row.adjustment === "special" && <Badge tone="purple">special</Badge>}
                          {row.adjustment === "initial" && row.adjustedRating !== null && (
                            <Badge tone="amber">initial</Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-900">
                        {row.finalRating ?? "—"}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          change === null || change === 0
                            ? "text-gray-400"
                            : change > 0
                              ? "text-emerald-600"
                              : "text-red-600"
                        }`}
                      >
                        {change === null ? "—" : change > 0 ? `+${change}` : change}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs leading-relaxed text-gray-400">
            USATT Ratings System (Aug 2025): points-exchange chart, pass 1 adjustments, unrated
            initial ratings, then the final pass. &ldquo;NR&rdquo; = unrated.{" "}
            <span className="text-amber-500">*</span> marks rows that depend on an inferred rating —
            OmniPong does not publish the estimated ratings USATT requires for unrated players who
            won or lost every rated match. Doubles are not rated and are excluded.
          </p>
        </>
      )}
    </div>
  );
}

function Badge({ tone, children }: { tone: "blue" | "purple" | "amber"; children: React.ReactNode }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    amber: "bg-amber-50 text-amber-700",
  } as const;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${tones[tone]}`}>
      {children}
    </span>
  );
}
