"use client";

import { useState, useEffect } from "react";
import type { PlayerResult } from "@/app/api/leagues/players/route";

type SSEEvent =
  | { type: "status"; message: string }
  | { type: "start"; title: string; total: number }
  | { type: "progress"; player: PlayerResult; done: number; total: number }
  | { type: "done"; results: PlayerResult[] }
  | { type: "error"; message: string };

export default function PlayersPage() {
  const [password, setPassword] = useState("");
  const [omniPongUrl, setOmniPongUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [rows, setRows] = useState<PlayerResult[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) setPassword(saved);
  }, []);

  async function handleLookup() {
    if (!password || !omniPongUrl) return;
    sessionStorage.setItem("admin_pw", password);

    setLoading(true);
    setError(null);
    setTitle(null);
    setProgress(null);
    setRows([]);
    setDone(false);

    try {
      const res = await fetch("/api/leagues/players", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${password}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: omniPongUrl }),
      });

      if (res.status === 401) {
        setError("Invalid password");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(await res.text());
        setLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as SSEEvent;
            if (event.type === "start") {
              setTitle(event.title);
              setProgress({ done: 0, total: event.total });
            } else if (event.type === "progress") {
              setProgress({ done: event.done, total: event.total });
              setRows((prev) => [...prev, event.player]);
            } else if (event.type === "done") {
              setRows(event.results);
              setDone(true);
              setLoading(false);
            } else if (event.type === "error") {
              setError(event.message);
              setLoading(false);
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
      setLoading(false);
    }
  }

  const ratingCell = (val: number | null) =>
    val !== null ? (
      <span className="font-mono">{val}</span>
    ) : (
      <span className="text-gray-400">—</span>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900">League Player Ratings</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500">Admin Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
            placeholder="Password"
          />
        </div>
        <div className="min-w-96">
          <label className="block text-xs text-gray-500">OmniPong Players URL</label>
          <input
            type="url"
            value={omniPongUrl}
            onChange={(e) => setOmniPongUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleLookup()}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
            placeholder="https://www.omnipong.com/T-tourney.asp?t=101&r=..."
          />
        </div>
        <button
          onClick={handleLookup}
          disabled={loading || !password || !omniPongUrl}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Looking up..." : "Look Up Ratings"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {title && (
        <p className="text-sm font-semibold text-gray-700">{title}</p>
      )}

      {progress && !done && (
        <div className="space-y-1.5">
          <p className="text-sm text-gray-500">
            Looked up {progress.done} of {progress.total} players…
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3 text-right">League</th>
                <th className="px-4 py-3 text-right">Tournament</th>
                <th className="px-4 py-3 text-right">Seed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={`${r.name}-${i}`} className="bg-white odd:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-400">
                    {done ? i + 1 : "—"}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-2.5 text-right text-gray-900">
                    {ratingCell(r.leagueRating)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {ratingCell(r.tournamentRating)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {ratingCell(r.seedRating)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
