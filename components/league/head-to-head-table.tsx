"use client";

import { Fragment, useState } from "react";
import type { H2HRow } from "@/lib/types";

type SortKey = "total" | "won" | "lost" | "winPct" | "opponentName";

export function HeadToHeadTable({ rows }: { rows: H2HRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? rows.filter((r) =>
        r.opponentName.toLowerCase().includes(filter.toLowerCase()),
      )
    : rows;

  const sorted = [...filtered].sort((a, b) => {
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
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-100">
          Head-to-Head vs All Opponents
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter opponent..."
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 sm:w-48"
          />
          {filter && (
            <button
              onClick={() => setFilter("")}
              className="text-sm text-slate-400 hover:text-slate-200"
              aria-label="Clear filter"
              style={{ lineHeight: 1 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-700 text-left text-xs uppercase tracking-wider text-slate-400">
              <th className="hidden px-3 py-2 sm:table-cell">#</th>
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
              <th className="hidden px-3 py-2 sm:table-cell" style={{ minWidth: 120 }}>
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
            {sorted.map((row, i) => {
              const isExpanded = expandedRow === row.opponentName;
              return (
                <Fragment key={row.opponentName}>
                  <tr
                    className="cursor-pointer border-b border-slate-700/50 hover:bg-slate-700/30"
                    onClick={() =>
                      setExpandedRow(isExpanded ? null : row.opponentName)
                    }
                  >
                    <td className="hidden px-3 py-2 text-slate-500 sm:table-cell">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold text-slate-100">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 text-xs text-slate-500 transition-transform" style={{ transform: isExpanded ? "rotate(90deg)" : undefined }}>▶</span>
                        <span>{row.opponentName}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 sm:px-3">
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-1">
                        <span className="inline-block rounded bg-emerald-900/60 px-1.5 py-0.5 text-xs font-semibold text-emerald-400">
                          {row.won}W
                        </span>
                        <span className="inline-block rounded bg-red-900/60 px-1.5 py-0.5 text-xs font-semibold text-red-400">
                          {row.lost}L
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 sm:px-3">{row.winPct}%</td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      <div className="h-2 w-24 overflow-hidden rounded bg-slate-700">
                        <div
                          className="h-full rounded bg-emerald-500"
                          style={{ width: `${row.winPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2 text-slate-400 sm:px-3">{row.total}</td>
                  </tr>
                  {isExpanded && row.matchDetails.length > 0 && (
                    <tr>
                      <td colSpan={4} className="bg-slate-900/50 px-3 pb-3 pt-1 sm:hidden">
                        <MatchDetailsInline row={row} />
                      </td>
                      <td colSpan={6} className="hidden bg-slate-900/50 px-3 pb-3 pt-1 sm:table-cell">
                        <MatchDetailsInline row={row} />
                      </td>

                    </tr>
                  )}
                </Fragment>
              );
            })}
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

function MatchDetailsInline({ row }: { row: H2HRow }) {
  return (
    <div className="ml-8 space-y-1">
      {row.matchDetails.map((m, idx) => (
        <div
          key={`${m.date}-${idx}`}
          className="flex items-center justify-between rounded px-3 py-1.5 text-xs"
          style={{
            backgroundColor: m.thomWon
              ? "rgba(5, 150, 105, 0.25)"
              : "rgba(153, 27, 27, 0.25)",
            color: m.thomWon ? "#6ee7b7" : "#fca5a5",
          }}
        >
          <span className="shrink-0 font-medium">
            {m.thomWon ? "W" : "L"} {m.thomSets}-{m.opponentSets}
          </span>
          <span className="ml-3 truncate text-right text-slate-400">
            {new Date(m.date + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "2-digit",
            })}
            {" · "}
            {m.eventName}
          </span>
        </div>
      ))}
    </div>
  );
}
