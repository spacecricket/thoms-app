"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import type { ScrapedEvent } from "@/lib/types";

export default function AdminPage() {
  const [password, setPassword] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) setPassword(saved);
  }, []);
  const [authenticated, setAuthenticated] = useState(false);
  const [events, setEvents] = useState<ScrapedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [statusMessages, setStatusMessages] = useState<
    Record<string, string>
  >({});

  const headers = useCallback(
    () => ({
      Authorization: `Bearer ${password}`,
      "Content-Type": "application/json",
    }),
    [password],
  );

  async function handleSearch() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nameFilter) params.set("name", nameFilter);
      const res = await fetch(
        `/api/league/admin/search?${params.toString()}`,
        { headers: headers() },
      );
      if (res.status === 401) {
        setAuthenticated(false);
        setError("Invalid password");
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setAuthenticated(true);
      sessionStorage.setItem("admin_pw", password);
      const data = await res.json();
      setEvents(data.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(eventId: string, reimport: boolean) {
    setImportingIds((prev) => new Set(prev).add(eventId));
    setStatusMessages((prev) => ({ ...prev, [eventId]: "Scraping..." }));
    try {
      const endpoint = reimport ? "reimport" : "import";
      const res = await fetch(
        `/api/league/admin/events/${eventId}/${endpoint}`,
        { method: "POST", headers: headers() },
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStatusMessages((prev) => ({
        ...prev,
        [eventId]: `Imported ${data.matchesImported} matches`,
      }));
      // Mark as imported in local state
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, alreadyImported: true, importedAt: new Date().toISOString() }
            : e,
        ),
      );
    } catch (e) {
      setStatusMessages((prev) => ({
        ...prev,
        [eventId]: `Error: ${e instanceof Error ? e.message : "failed"}`,
      }));
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  }

  async function handleImportAll() {
    const toImport = events.filter((e) => !e.alreadyImported);
    for (const event of toImport) {
      await handleImport(event.id, false);
    }
  }

  async function handleReimportAll() {
    for (const event of events) {
      await handleImport(event.id, true);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">
          League Admin — Import Events
        </h1>
        <Link
          href="/league/join"
          className="text-sm text-slate-400 hover:text-slate-100"
        >
          Join League →
        </Link>
      </div>

      {/* Auth + Search */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-400">Admin Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            placeholder="Password"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400">
            Filter by Name
          </label>
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="mt-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
            placeholder="e.g. Saturday Night"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !password}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Scraping USATT..." : "Search Events"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {authenticated && events.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">
            {events.length} events found · {events.filter((e) => e.alreadyImported).length} already imported
          </span>
          <button
            onClick={handleImportAll}
            disabled={importingIds.size > 0}
            className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            Import All New
          </button>
          <button
            onClick={handleReimportAll}
            disabled={importingIds.size > 0}
            className="rounded bg-amber-700 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Re-import All
          </button>
        </div>
      )}

      {/* Events List */}
      {events.length > 0 && (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-100">
                    {event.name}
                  </span>
                  <span className="font-extralight text-xs text-slate-100">
                    {event.id}
                  </span>
                  {event.alreadyImported && (
                    <span className="rounded bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-400">
                      Imported
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {event.date} · Rating: {event.ratingBefore ?? "Unrated"} →{" "}
                  {event.ratingAfter} · {event.won}W/{event.lost}L
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusMessages[event.id] && (
                  <span className="text-xs text-slate-400">
                    {statusMessages[event.id]}
                  </span>
                )}
                {event.alreadyImported ? (
                  <button
                    onClick={() => handleImport(event.id, true)}
                    disabled={importingIds.has(event.id)}
                    className="rounded bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {importingIds.has(event.id)
                      ? "Scraping..."
                      : "Re-import"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleImport(event.id, false)}
                    disabled={importingIds.has(event.id)}
                    className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {importingIds.has(event.id) ? "Scraping..." : "Import"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
