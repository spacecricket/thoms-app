import type { AnalysisData } from "@/lib/types";

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
      ? "text-emerald-400"
      : color === "red"
        ? "text-red-400"
        : "text-slate-100";
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4">
      <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
}

export function StatsRow({ player }: { player: AnalysisData["player"] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <StatCard
        value={player.currentRating}
        label="Current Rating"
        color="green"
      />
      <StatCard value={player.totalEvents} label="Events Played" />
      <StatCard value={player.totalMatches} label="Total Matches" />
      <StatCard value={player.totalWon} label="Matches Won" color="green" />
      <StatCard value={player.totalLost} label="Matches Lost" color="red" />
      <StatCard value={`${player.winPct}%`} label="Win Rate" />
      <StatCard
        value={`${player.ratingGain >= 0 ? "+" : ""}${player.ratingGain}`}
        label="Rating Gain"
        color="green"
      />
    </div>
  );
}
