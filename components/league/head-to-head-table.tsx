"use client";

import { useState } from "react";
import type { H2HRow } from "@/lib/types";

type SortKey = "total" | "won" | "lost" | "winPct" | "opponentName";

export function HeadToHeadTable({ rows }: { rows: H2HRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = [...rows].sort((a, b) => {
    const dir = sortDesc ? -1 : 1;
    if (sortKey === "opponentName") {
      return dir * a.opponentName.localeCompare(b.opponentName);
    }
    return dir * ((a[sortKey] as number) - (b[sortKey] as number));
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(key !== "opponentName");
    }
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDesc ? " ↓" : " ↑") : "";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
      <h2 className="mb-5 text-lg font-semibold text-slate-100">
        Head-to-Head vs All Opponents
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-700 text-left text-xs uppercase tracking-wider text-slate-400">
              <th className="px-3 py-2">#</th>
              <th
                className="cursor-pointer px-3 py-2"
                onClick={() => handleSort("opponentName")}
              >
                Opponent{arrow("opponentName")}
              </th>
              <th className="px-3 py-2">Record</th>
              <th
                className="cursor-pointer px-3 py-2"
                onClick={() => handleSort("winPct")}
              >
                Win%{arrow("winPct")}
              </th>
              <th className="px-3 py-2" style={{ minWidth: 120 }}>
                Win Rate
              </th>
              <th
                className="cursor-pointer px-3 py-2"
                onClick={() => handleSort("total")}
              >
                Matches{arrow("total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.opponentName}
                className="border-b border-slate-700/50 hover:bg-slate-700/30"
              >
                <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                <td className="px-3 py-2 font-semibold text-slate-100">
                  {row.opponentName}
                </td>
                <td className="px-3 py-2">
                  <span className="mr-1 inline-block rounded bg-emerald-900/60 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    {row.won}W
                  </span>
                  <span className="inline-block rounded bg-red-900/60 px-2 py-0.5 text-xs font-semibold text-red-400">
                    {row.lost}L
                  </span>
                </td>
                <td className="px-3 py-2">{row.winPct}%</td>
                <td className="px-3 py-2">
                  <div className="h-2 w-24 overflow-hidden rounded bg-slate-700">
                    <div
                      className="h-full rounded bg-emerald-500"
                      style={{ width: `${row.winPct}%` }}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-400">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-10 text-center text-slate-500">
            No match data imported yet.
          </p>
        )}
      </div>
    </div>
  );
}
