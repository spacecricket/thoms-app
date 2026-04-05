"use client";

export interface StatsRowProps {
  currentRating: number;
  totalEvents: number;
  totalMatches: number;
  totalWon: number;
  totalLost: number;
  winPct: number;
  ratingGain: number;
}

function StatCard({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color?: "green" | "red";
}) {
  const colorClass =
    color === "green"
      ? "text-emerald-600"
      : color === "red"
        ? "text-red-500"
        : "text-gray-900";
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 sm:px-5 sm:py-4">
      <div className={`tabular-nums text-2xl font-bold sm:text-3xl ${colorClass}`}>{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}

export function StatsRow(props: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard value={props.totalEvents} label="Events Played" />
      <StatCard value={props.totalMatches} label="Total Matches" />
      <StatCard value={`${props.winPct}%`} label="Win Rate" />
      <StatCard
        value={`${props.ratingGain >= 0 ? "+" : ""}${props.ratingGain}`}
        label="Rating Gain"
        color={props.ratingGain >= 0 ? "green" : "red"}
      />
    </div>
  );
}
