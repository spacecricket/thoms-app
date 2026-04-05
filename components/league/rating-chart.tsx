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
  onDotClick: (eventId: string, eventName: string) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export function RatingChart({ timeline, onDotClick }: Props) {
  const data = (() => {
    const seen = new Map<number, number>();
    return timeline.map((e) => {
      const delta = e.ratingAfter - (e.ratingBefore ?? e.ratingAfter);
      let ts = new Date(e.date + "T00:00:00").getTime();
      const count = seen.get(ts) ?? 0;
      seen.set(ts, count + 1);
      ts += count * 24 * 60 * 60 * 1000;
      return {
        id: e.id,
        date: e.date,
        ts,
        rating: e.ratingAfter,
        name: e.name,
        ratingBefore: e.ratingBefore,
        delta,
        won: e.won,
        lost: e.lost,
        hasNotes: e.hasNotes,
      };
    });
  })();

  const renderDot = (props: any, isActive = false) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload) return <g />;
    const fill = payload.delta >= 0 ? "#22c55e" : "#ef4444";
    const r = isActive ? 6 : 4;
    return (
      <g
        key={`dot-${payload.ts}-${isActive ? "active" : "idle"}`}
        onClick={(e) => {
          e.stopPropagation();
          onDotClick(payload.id, payload.name);
        }}
        style={{ cursor: "pointer" }}
      >
        {/* Larger invisible hit area */}
        <circle cx={cx} cy={cy} r={14} fill="transparent" stroke="none" />
        <circle cx={cx} cy={cy} r={r} fill={fill} stroke={fill} />
        {payload.hasNotes && (
          <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={fill} strokeWidth={1.5} />
        )}
      </g>
    );
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 sm:p-6">
      <h2 className="mb-5 text-lg font-semibold text-slate-100">
        League Rating Over Time
      </h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
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
            width={45}
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
                  {d.hasNotes && (
                    <div className="mt-1 text-blue-400">Has notes — click to view</div>
                  )}
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#60a5fa"
            strokeWidth={2.5}
            dot={(props: any) => renderDot(props, false)}
            activeDot={(props: any) => renderDot(props, true)}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
