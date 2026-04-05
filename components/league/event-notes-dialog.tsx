"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchRecord } from "@/lib/types";

interface TimelineEvent {
  id: string;
  date: string;
  name: string;
  ratingBefore: number | null;
  ratingAfter: number;
  won: number;
  lost: number;
}

interface Props {
  event: TimelineEvent | null;
  matches: MatchRecord[];
  onClose: () => void;
  onNotesChanged: (eventId: string, hasNotes: boolean) => void;
}

const PW_KEY = "admin_pw";

export function EventDetailDialog({ event, matches, onClose, onNotesChanged }: Props) {
  const [showNotes, setShowNotes] = useState(false);
  const [password, setPassword] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(PW_KEY) ?? "" : "",
  );
  const [authed, setAuthed] = useState(false);
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchNotes = useCallback(
    async (pw: string) => {
      if (!event) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/league/notes/${event.id}`, {
          headers: { Authorization: `Bearer ${pw}` },
        });
        if (res.status === 401) {
          setAuthed(false);
          setError("Wrong password");
          sessionStorage.removeItem(PW_KEY);
          return;
        }
        if (!res.ok) throw new Error("Failed to load notes");
        const data = await res.json();
        setAuthed(true);
        setNotes(data.notes ?? "");
        sessionStorage.setItem(PW_KEY, pw);
        if (!data.notes) setEditing(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    },
    [event],
  );

  // Reset state when event changes; auto-fetch if already authed
  useEffect(() => {
    if (!event) return;
    setShowNotes(false);
    setNotes("");
    setEditing(false);
    setError("");
    setAuthed(false);
    const stored = sessionStorage.getItem(PW_KEY);
    if (stored) {
      setPassword(stored);
      setShowNotes(true);
      fetchNotes(stored);
    }
  }, [event, fetchNotes]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotes(password);
  };

  const handleSave = async () => {
    if (!event) return;
    const pw = sessionStorage.getItem(PW_KEY) ?? password;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/league/notes/${event.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${pw}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEditing(false);
      onNotesChanged(event.id, !!notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  if (!event) return null;

  const delta = event.ratingAfter - (event.ratingBefore ?? event.ratingAfter);
  const sign = delta >= 0 ? "+" : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-5 pt-5 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {event.name}
            </h3>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              <span>{event.date}</span>
              <span>
                {event.ratingBefore ?? "Unrated"} → {event.ratingAfter}{" "}
                <span className={delta >= 0 ? "text-emerald-600" : "text-red-500"}>
                  ({sign}{delta})
                </span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Matches */}
        <div className="px-5 py-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Matches ({event.won}W / {event.lost}L)
          </h4>
          {matches.length > 0 ? (
            <div className="space-y-1.5">
              {matches.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                  style={{
                    backgroundColor: m.thomWon
                      ? "rgba(5, 150, 105, 0.08)"
                      : "rgba(220, 38, 38, 0.06)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${m.thomWon ? "text-emerald-600" : "text-red-500"}`}
                    >
                      {m.thomWon ? "W" : "L"}
                    </span>
                    <span className="text-gray-900">{m.opponentName}</span>
                  </div>
                  <span className="tabular-nums text-gray-500">
                    {m.thomSets}-{m.opponentSets}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No match data available.</p>
          )}
        </div>

        {/* Notes section */}
        <div className="border-t border-gray-100 px-5 py-4">
          {!showNotes ? (
            <button
              onClick={() => setShowNotes(true)}
              className="text-sm text-blue-600 transition-colors hover:text-blue-500"
            >
              View / Add Notes
            </button>
          ) : !authed ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <p className="text-sm text-gray-500">
                Enter password to view or add notes.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loading ? "..." : "Unlock"}
                </button>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </form>
          ) : loading ? (
            <p className="text-sm text-gray-500">Loading notes...</p>
          ) : editing ? (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Notes
              </h4>
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What went well? What didn't? How to improve next time?"
                rows={8}
                className="w-full resize-y rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                {notes && (
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : notes ? (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Notes
              </h4>
              <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                {notes}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-blue-600 transition-colors hover:text-blue-500"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Notes
              </h4>
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What went well? What didn't? How to improve next time?"
                rows={8}
                className="w-full resize-y rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
