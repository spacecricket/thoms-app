"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  eventId: string | null;
  eventName: string | null;
  onClose: () => void;
  onNotesChanged: (eventId: string, hasNotes: boolean) => void;
}

const PW_KEY = "admin_pw";

export function EventNotesDialog({ eventId, eventName, onClose, onNotesChanged }: Props) {
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
      if (!eventId) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/league/notes/${eventId}`, {
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
    [eventId],
  );

  useEffect(() => {
    if (!eventId) return;
    setNotes("");
    setEditing(false);
    setError("");
    const stored = sessionStorage.getItem(PW_KEY);
    if (stored) {
      setPassword(stored);
      fetchNotes(stored);
    } else {
      setAuthed(false);
    }
  }, [eventId, fetchNotes]);

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
    if (!eventId) return;
    const pw = sessionStorage.getItem(PW_KEY) ?? password;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/league/notes/${eventId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${pw}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEditing(false);
      onNotesChanged(eventId, !!notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  if (!eventId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Event Notes
            </h3>
            {eventName && (
              <p className="mt-0.5 text-sm text-gray-500">{eventName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {!authed ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <p className="text-sm text-gray-500">
              Enter password to view or add notes.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none"
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Checking..." : "Unlock"}
            </button>
          </form>
        ) : loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : editing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What went well? What didn't? How to improve next time?"
              rows={12}
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
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : notes ? (
          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              {notes}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">No notes for this event.</p>
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Add Notes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
