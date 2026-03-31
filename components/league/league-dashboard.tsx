"use client";

import { useMemo, useState } from "react";
import { RatingChart } from "./rating-chart";
import { HeadToHeadTable } from "./head-to-head-table";
import { StatsRow } from "./stats-row";
import type { AnalysisData, H2HRow, H2HMatchDetail } from "@/lib/types";

interface Props {
  data: AnalysisData;
}

export function LeagueDashboard({ data }: Props) {
  const { ratingTimeline, matches } = data;

  // Deduplicated sorted dates for the slider
  const uniqueDates = useMemo(
    () => [...new Set(ratingTimeline.map((e) => e.date))],
    [ratingTimeline],
  );

  const [startIdx, setStartIdx] = useState(0);

  const startDate = uniqueDates[startIdx] ?? uniqueDates[0];

  // Filter timeline: include all events on or after the selected start date
  const filteredTimeline = useMemo(
    () => ratingTimeline.filter((e) => e.date >= startDate),
    [ratingTimeline, startDate],
  );

  // Build a set of event IDs that are within the date range
  const activeEventIds = useMemo(
    () => new Set(filteredTimeline.map((e) => e.id)),
    [filteredTimeline],
  );

  // Build a lookup from eventId → { date, name }
  const eventLookup = useMemo(() => {
    const map = new Map<string, { date: string; name: string }>();
    for (const e of ratingTimeline) {
      map.set(e.id, { date: e.date, name: e.name });
    }
    return map;
  }, [ratingTimeline]);

  // Recompute H2H from raw matches filtered by active events, keyed by usattId
  const filteredH2H: H2HRow[] = useMemo(() => {
    const h2hMap = new Map<
      string,
      { opponentName: string; won: number; lost: number; scores: string[]; matchDetails: H2HMatchDetail[] }
    >();
    for (const m of matches) {
      if (!activeEventIds.has(m.eventId)) continue;
      const existing = h2hMap.get(m.opponentUsattId) ?? {
        opponentName: m.opponentName,
        won: 0,
        lost: 0,
        scores: [],
        matchDetails: [],
      };
      if (m.thomWon) existing.won++;
      else existing.lost++;
      existing.scores.push(`${m.thomWon ? "W" : "L"} ${m.thomSets}-${m.opponentSets}`);
      const evt = eventLookup.get(m.eventId);
      existing.matchDetails.push({
        date: evt?.date ?? "",
        eventName: evt?.name ?? "",
        thomSets: m.thomSets,
        opponentSets: m.opponentSets,
        thomWon: m.thomWon,
      });
      h2hMap.set(m.opponentUsattId, existing);
    }
    return [...h2hMap.entries()]
      .map(([, { opponentName, won, lost, scores, matchDetails }]) => {
        const total = won + lost;
        matchDetails.sort((a, b) => a.date.localeCompare(b.date));
        return {
          opponentName,
          won,
          lost,
          total,
          winPct: total > 0 ? Math.round((100 * won) / total) : 0,
          scores,
          matchDetails,
        };
      })
      .sort(
        (a, b) =>
          b.total - a.total || a.opponentName.localeCompare(b.opponentName),
      );
  }, [matches, activeEventIds, eventLookup]);

  // Compute filtered stats
  const filteredStats = useMemo(() => {
    const filteredMatches = matches.filter((m) => activeEventIds.has(m.eventId));
    const totalWon = filteredMatches.filter((m) => m.thomWon).length;
    const totalLost = filteredMatches.filter((m) => !m.thomWon).length;
    const totalMatches = totalWon + totalLost;
    const first = filteredTimeline[0];

    // For current rating, use the max ratingAfter from the latest date
    // (same-day events may have different ratingAfter values)
    const lastDate = filteredTimeline.length > 0
      ? filteredTimeline[filteredTimeline.length - 1].date
      : null;
    const lastDayEvents = lastDate
      ? filteredTimeline.filter((e) => e.date === lastDate)
      : [];
    const currentRating = lastDayEvents.length > 0
      ? Math.max(...lastDayEvents.map((e) => e.ratingAfter))
      : 0;

    // For rating gain, use the min ratingBefore from the first date
    const firstDate = first?.date ?? null;
    const firstDayEvents = firstDate
      ? filteredTimeline.filter((e) => e.date === firstDate)
      : [];
    const startRating = firstDayEvents.length > 0
      ? Math.min(...firstDayEvents.map((e) => e.ratingBefore ?? e.ratingAfter))
      : 0;

    return {
      currentRating,
      totalEvents: filteredTimeline.length,
      totalMatches,
      totalWon,
      totalLost,
      winPct: totalMatches > 0 ? Math.round((100 * totalWon) / totalMatches) : 0,
      ratingGain: filteredTimeline.length > 0 ? currentRating - startRating : 0,
    };
  }, [matches, activeEventIds, filteredTimeline]);

  return (
    <div className="space-y-8">
      {/* Sticky header: title + slider */}
      <div className="sticky top-0 z-30 -mx-3 bg-slate-900/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
                Thom&#39;s Leagues
              </h1>
              <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                USATT# 287622
              </p>
            </div>
            <div className="flex flex-col items-center">
              <span className="tabular-nums text-2xl font-bold text-emerald-400 sm:text-3xl">
                {filteredStats.currentRating}
              </span>
              <span className="text-xs text-slate-400">Rating</span>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:max-w-lg">
            <span className="shrink-0 text-xs text-slate-400">From</span>
            <input
              type="range"
              min={0}
              max={uniqueDates.length - 1}
              value={startIdx}
              onChange={(e) => setStartIdx(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
            />
            <span className="shrink-0 text-xs font-medium text-slate-200">
              {startDate}
            </span>
          </div>
        </div>
      </div>

      <StatsRow {...filteredStats} />
      <RatingChart timeline={filteredTimeline} />
      <HeadToHeadTable rows={filteredH2H} />
    </div>
  );
}
