"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { AnalysisData } from "@/lib/types";

interface Props {
  timeline: AnalysisData["ratingTimeline"];
}

export function RatingChart({ timeline }: Props) {
  const data = (() => {
    const seen = new Map<number, number>();
    return timeline.map((e) => {
      const delta = e.ratingAfter - (e.ratingBefore ?? e.ratingAfter);
      let ts = new Date(e.date + "T00:00:00").getTime();
      // Offset same-day events by 1 day each so both dots are visually distinct
      const count = seen.get(ts) ?? 0;
      seen.set(ts, count + 1);
      ts += count * 24 * 60 * 60 * 1000;
      return {
        date: e.date,
        ts,
        rating: e.ratingAfter,
        name: e.name,
        ratingBefore: e.ratingBefore,
        delta,
        won: e.won,
        lost: e.lost,
      };
    });
  })();

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 sm:p-6">
      <h2 className="mb-5 text-lg font-semibold text-slate-100">
        League Rating Over Time
      </h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            allowDuplicatedCategory={false}
            ticks={(() => {
              if (data.length === 0) return [];
              const min = new Date(data[0].ts);
              const max = new Date(data[data.length - 1].ts);
              const ticks: number[] = [];
              const d = new Date(min.getFullYear(), min.getMonth(), 1);
              // Start from the next 1st if min isn't already the 1st
              if (d.getTime() < min.getTime()) d.setMonth(d.getMonth() + 1);
              while (d.getTime() <= max.getTime()) {
                ticks.push(d.getTime());
                d.setMonth(d.getMonth() + 1);
              }
              return ticks;
            })()}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickFormatter={(v: number) =>
              new Date(v).toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              })
            }
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            domain={[(v: number) => Math.floor(v / 100) * 100, (v: number) => Math.ceil(v / 100) * 100]}
            ticks={(() => {
              const min = Math.floor(Math.min(...data.map(d => d.rating)) / 100) * 100;
              const max = Math.ceil(Math.max(...data.map(d => d.rating)) / 100) * 100;
              const t = [];
              for (let v = min; v <= max; v += 100) t.push(v);
              return t;
            })()}
            label={{
              value: "Rating",
              angle: -90,
              position: "insideLeft",
              fill: "#94a3b8",
              fontSize: 12,
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              const sign = d.delta >= 0 ? "+" : "";
              return (
                <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-lg">
                  <div className="font-semibold text-slate-100">{d.date}</div>
                  <div className="text-slate-400">{d.name}</div>
                  <div className="mt-1 text-slate-300">
                    {d.ratingBefore ?? "Unrated"} → {d.rating} (
                    <span
                      className={
                        d.delta >= 0 ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {sign}
                      {d.delta}
                    </span>
                    )
                  </div>
                  <div className="text-slate-400">
                    {d.won}W / {d.lost}L
                  </div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#60a5fa"
            strokeWidth={2.5}
            dot={(props) => {
              const { cx, cy, payload } = props;
              const fill = payload.delta >= 0 ? "#22c55e" : "#ef4444";
              return (
                <circle
                  key={`dot-${payload.date}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={fill}
                  stroke={fill}
                />
              );
            }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
