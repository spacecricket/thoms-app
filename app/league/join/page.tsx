"use client";

import { useState, useEffect, useRef, useCallback } from "react";

function todayMMDDYY(): string {
  const now = new Date();
  const pt = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
  );
  const mm = String(pt.getMonth() + 1).padStart(2, "0");
  const dd = String(pt.getDate()).padStart(2, "0");
  const yy = String(pt.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

export default function JoinLeaguePage() {
  const [password, setPassword] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [leagueDate, setLeagueDate] = useState(todayMMDDYY);
  const [status, setStatus] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) setPassword(saved);
  }, []);

  // Auto-scroll the status log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [status]);

  const headers = useCallback(
    () => ({
      Authorization: `Bearer ${password}`,
      "Content-Type": "application/json",
    }),
    [password],
  );

  async function handleJoin() {
    setIsRunning(true);
    setStatus([]);
    setError(null);
    sessionStorage.setItem("admin_pw", password);

    try {
      const res = await fetch("/api/league/join", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ leagueName, leagueDate }),
      });

      if (res.status === 401) {
        setError("Invalid password.");
        setIsRunning(false);
        return;
      }

      if (!res.ok) {
        setError(`Server error: ${res.status}`);
        setIsRunning(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop()!;
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6));
          if (payload.message) {
            setStatus((prev) => [...prev, payload.message]);
          }
          if (payload.error) {
            setError(payload.error);
          }
          if (payload.done) {
            setStatus((prev) => [...prev, "Done."]);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-100">Join League</h1>
      <p className="text-sm text-slate-400">
        Auto-join an OmniPong league as soon as entry opens.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400">Admin Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500 sm:w-64"
            placeholder="Password"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400">League Name</label>
          <input
            type="text"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            placeholder='e.g. Spttc Saturday League O-1300 3/07'
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400">
            Date (MM/DD/YY)
          </label>
          <input
            type="text"
            value={leagueDate}
            onChange={(e) => setLeagueDate(e.target.value)}
            className="mt-1 w-40 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            placeholder="03/07/26"
          />
        </div>

        <button
          onClick={handleJoin}
          disabled={isRunning || !password || !leagueName.trim()}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {isRunning ? "Joining..." : "Join League"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {status.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-300">
            Status Log
          </h2>
          <div
            ref={logRef}
            className="max-h-80 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-300"
          >
            {status.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.startsWith("Error")
                    ? "text-red-400"
                    : msg.startsWith("Successfully")
                      ? "text-emerald-400"
                      : ""
                }
              >
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
