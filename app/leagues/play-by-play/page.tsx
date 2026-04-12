"use client";

import { useState, useEffect, useCallback } from "react";
import { PlayByPlayView } from "@/components/league/play-by-play-view";

// ─── Types ────────────────────────────────────────────────────────────────────

type Player = "thom" | "opponent";
type Side = "left" | "right";

interface MatchState {
  setNumber: number;
  thomSetScore: number;
  oppSetScore: number;
  thomSetsWon: number;
  oppSetsWon: number;
  nextServer: Player | null;
  matchComplete: boolean;
  setJustCompleted?: boolean;
}

interface MatchInfo {
  id: string;
  opponentName: string;
  opponentUsattId: string | null;
  thomSide: Side;
  tossWinner: Player;
  firstServer: Player;
  status: string;
  matchDate?: string;
}

interface KnownOpponent {
  usattId: string;
  name: string;
}

const SHOTS = [
  { key: "serve",   label: "Serve",   category: "special"   },
  { key: "push",    label: "Push",    category: "defensive" },
  { key: "chop",    label: "Chop",    category: "defensive" },
  { key: "lob",     label: "Lob",     category: "defensive" },
  { key: "block",   label: "Block",   category: "defensive" },
  { key: "drive",   label: "Drive",   category: "neutral"   },
  { key: "counter", label: "Counter", category: "neutral"   },
  { key: "flick",   label: "Flick",   category: "offensive" },
  { key: "loop",    label: "Loop",    category: "offensive" },
  { key: "drop",    label: "Drop",    category: "offensive" },
  { key: "smash",   label: "Smash",   category: "offensive" },
  { key: "unknown", label: "?",       category: "special"   },
] as const;
type ShotKey = (typeof SHOTS)[number]["key"];

// ─── One player's column ─────────────────────────────────────────────────────

function categoryColor(category: string): string {
  if (category === "defensive") return "bg-sky-100 text-sky-800";
  if (category === "neutral")   return "bg-amber-100 text-amber-800";
  if (category === "offensive") return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-600"; // special (serve, ?)
}

function PlayerColumn({
  isServing,
  shotBy,
  opponentName,
  backhand,
  onBackhandChange,
  selectedShot,
  onShotSelect,
  onCommit,
  disabled,
  disableServe,
  pointScore,
  onPointUp,
  onPointDown,
}: {
  isServing: boolean;
  shotBy: Player;
  opponentName: string;
  backhand: boolean | null;
  onBackhandChange: (value: boolean | null) => void;
  selectedShot: ShotKey | null;
  onShotSelect: (shot: ShotKey) => void;
  onCommit: (outcome: "winner" | "error") => void;
  disabled: boolean;
  disableServe: boolean;
  pointScore: number;
  onPointUp: () => void;
  onPointDown: () => void;
}) {
  const isThom = shotBy === "thom";
  const activeHandBtn = isThom
    ? "bg-blue-600 text-white shadow-md scale-105"
    : "bg-red-600 text-white shadow-md scale-105";
  const inactiveHandBtn = isThom
    ? "bg-blue-50 text-blue-300 hover:bg-blue-100"
    : "bg-red-50 text-red-300 hover:bg-red-100";
  const nameColor = isThom ? "text-blue-700" : "text-red-700";
  const adjBtn = "flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-black text-gray-400 hover:bg-gray-200 active:scale-90";
  const selectedShotColor = isThom
    ? "bg-blue-600 text-white border-blue-800"
    : "bg-red-600 text-white border-red-800";

  function toggleHand(val: boolean) {
    onBackhandChange(backhand === val ? null : val);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl">
      {/* Header: BH · Name+score · FH */}
      <div className="flex items-stretch gap-1.5 p-1.5">
        <button
          onPointerDown={() => toggleHand(true)}
          className={`flex flex-1 items-center justify-center rounded-xl py-5 text-sm font-black uppercase tracking-widest transition-all active:scale-95 ${backhand === true ? activeHandBtn : inactiveHandBtn}`}
        >
          BH
        </button>
        <div className="flex flex-2 flex-col items-center justify-center gap-0.5 text-center">
          <div className="relative flex min-h-8 items-center justify-center">
            <span className={`text-xs font-black uppercase leading-none tracking-widest ${nameColor}`}>
              {isThom ? "Thom" : opponentName}
            </span>
            {isServing && (
              <span className="absolute -right-9 text-3xl leading-none" title="Serving">🏓</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onPointerDown={onPointDown} className={adjBtn}>−</button>
            <span className={`text-5xl font-black tabular-nums leading-none ${nameColor}`}>{pointScore}</span>
            <button onPointerDown={onPointUp} className={adjBtn}>+</button>
          </div>
        </div>
        <button
          onPointerDown={() => toggleHand(false)}
          className={`flex flex-1 items-center justify-center rounded-xl py-5 text-sm font-black uppercase tracking-widest transition-all active:scale-95 ${backhand === false ? activeHandBtn : inactiveHandBtn}`}
        >
          FH
        </button>
      </div>

      {/* Shot grid */}
      <div className="grid flex-1 grid-cols-4 grid-rows-3 gap-1 p-1">
        {SHOTS.map(({ key, label, category }) => {
          const isSelected = selectedShot === key;
          const isDisabled = disabled || (key === "serve" && disableServe);
          const colorClass = isSelected
            ? selectedShotColor
            : selectedShot !== null
              ? "bg-gray-100 text-gray-400"
              : categoryColor(category);
          return (
            <button
              key={key}
              onPointerDown={() => !isDisabled && onShotSelect(key)}
              disabled={isDisabled}
              className={`flex items-center justify-center rounded-xl border-b-4 border-black/15 shadow-sm transition-all active:translate-y-px active:border-b-0 active:shadow-none disabled:opacity-30 ${colorClass} ${isSelected ? "scale-95" : ""}`}
            >
              <span className="text-sm font-bold leading-none">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Commit: Winner | Error */}
      <div className="flex items-stretch gap-1.5 px-1.5 py-2 pb-1.5">
        <button
          onPointerDown={() => !disabled && onCommit("winner")}
          disabled={disabled}
          className="flex flex-1 items-center justify-center rounded-xl py-4 text-sm font-black uppercase tracking-wide bg-emerald-500 text-white shadow-sm active:scale-95 active:opacity-80 disabled:opacity-40"
        >
          ✓ Winner
        </button>
        <button
          onPointerDown={() => !disabled && onCommit("error")}
          disabled={disabled}
          className="flex flex-1 items-center justify-center rounded-xl py-4 text-sm font-black uppercase tracking-wide bg-rose-200 text-rose-900 shadow-sm active:scale-95 active:opacity-80 disabled:opacity-40"
        >
          ✗ Error
        </button>
      </div>
    </div>
  );
}

// ─── Recording Phase ───────────────────────────────────────────────────────────

function RecordingPhase({
  match,
  initialState,
  password,
}: {
  match: MatchInfo;
  initialState: MatchState;
  password: string;
}) {
  const [state, setState] = useState<MatchState>(initialState);
  const [thomSide, setThomSide] = useState<Side>(match.thomSide);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<"set" | "match" | null>(null);
  const [thomBackhand, setThomBackhand] = useState<boolean | null>(null);
  const [oppBackhand, setOppBackhand] = useState<boolean | null>(null);
  const [thomShot, setThomShot] = useState<ShotKey | null>(null);
  const [oppShot, setOppShot] = useState<ShotKey | null>(null);

  const headers = useCallback(
    () => ({
      Authorization: `Bearer ${password}`,
      "Content-Type": "application/json",
    }),
    [password],
  );

  // Who is on left vs right given thomSide
  const leftPlayer: Player = thomSide === "left" ? "thom" : "opponent";
  const rightPlayer: Player = thomSide === "left" ? "opponent" : "thom";

  const shortName = match.opponentName.split(" ")[0];

  // ── Record a point ────────────────────────────────────────────────────────
  async function handleCommit(shotBy: Player, outcome: "winner" | "error") {
    if (busy) return;
    setBusy(true);
    try {
      const thomWins = (shotBy === "thom") === (outcome === "winner");
      const winner: Player = thomWins ? "thom" : "opponent";
      const shotType = shotBy === "thom" ? thomShot : oppShot;
      const backhand = shotBy === "thom" ? thomBackhand : oppBackhand;

      const res = await fetch(`/api/leagues/recordings/${match.id}/points`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ winner, shotBy, shotType, pointType: outcome, backhand }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setState(data.state);
      setThomBackhand(null);
      setOppBackhand(null);
      setThomShot(null);
      setOppShot(null);

      if (data.state.matchComplete) {
        setFlash("match");
      } else if (data.state.setJustCompleted) {
        setFlash("set");
        setThomSide((s) => (s === "left" ? "right" : "left"));
        setTimeout(() => setFlash(null), 2000);
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Undo ──────────────────────────────────────────────────────────────────
  async function undo() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/leagues/recordings/${match.id}/points`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setState(data.state);
      setFlash(null);
    } finally {
      setBusy(false);
    }
  }

  // ── Direct state patch (manual score adjustment) ──────────────────────────
  async function patchState(patch: Partial<{
    setNumber: number;
    thomSetScore: number;
    oppSetScore: number;
    thomSetsWon: number;
    oppSetsWon: number;
  }>) {
    const res = await fetch(`/api/leagues/recordings/${match.id}/state`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    const data = await res.json();
    setState(data.state);
    setFlash(null);
  }

  // ── Sets won adjusters ─────────────────────────────────────────────────────
  async function adjustSets(player: Player, delta: 1 | -1) {
    const newThom =
      player === "thom"
        ? Math.max(0, Math.min(3, state.thomSetsWon + delta))
        : state.thomSetsWon;
    const newOpp =
      player === "opponent"
        ? Math.max(0, Math.min(3, state.oppSetsWon + delta))
        : state.oppSetsWon;
    // Switching sets resets current set score and advances set number
    const newSetNum = newThom + newOpp + 1;
    await patchState({
      thomSetsWon: newThom,
      oppSetsWon: newOpp,
      setNumber: Math.min(5, newSetNum),
      thomSetScore: 0,
      oppSetScore: 0,
    });
  }

  // ── Point score adjusters (create blank points or undo) ───────────────────
  async function addBlankPoint(winner: Player) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/leagues/recordings/${match.id}/points`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ winner }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setState(data.state);
    } finally {
      setBusy(false);
    }
  }

  // ── Match complete screen ─────────────────────────────────────────────────
  if (state.matchComplete && flash !== null) {
    const thomWon = state.thomSetsWon > state.oppSetsWon;
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-6 bg-white">
        <div className="text-7xl">{thomWon ? "🏆" : "💪"}</div>
        <h1 className="text-5xl font-black text-gray-900">
          {thomWon ? "Thom wins!" : `${shortName} wins`}
        </h1>
        <p className="text-3xl font-light text-gray-500">
          {state.thomSetsWon} – {state.oppSetsWon}
        </p>
        <button
          onClick={undo}
          className="mt-4 rounded-xl border border-gray-300 px-8 py-4 text-base font-semibold text-gray-600 hover:bg-gray-50"
        >
          ↩ Undo Last Point
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white select-none">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className={`shrink-0 border-b transition-colors ${flash === "set" ? "border-yellow-200 bg-yellow-50" : "border-gray-100 bg-white"}`}>
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onPointerDown={() => setThomSide(thomSide === "left" ? "right" : "left")}
            className="shrink-0 rounded border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700"
          >
            ⇄ Sides
          </button>

          <div className="flex flex-col items-center">
            {flash === "set" ? (
              <p className="text-base font-black text-yellow-700">Set complete! →</p>
            ) : (
              <>
                {/* Thom (− N +) vs Amaro (− N +) */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-gray-800">Thom</span>
                  <button onPointerDown={() => adjustSets("thom", -1)} className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-xs font-black text-gray-400 hover:bg-gray-200 active:scale-90">−</button>
                  <span className="min-w-[1ch] text-center text-2xl font-black text-gray-800">{state.thomSetsWon}</span>
                  <button onPointerDown={() => adjustSets("thom", 1)} className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-xs font-black text-gray-400 hover:bg-gray-200 active:scale-90">+</button>
                  <span className="px-0.5 text-xs text-gray-400">vs</span>
                  <button onPointerDown={() => adjustSets("opponent", -1)} className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-xs font-black text-gray-400 hover:bg-gray-200 active:scale-90">−</button>
                  <span className="min-w-[1ch] text-center text-2xl font-black text-gray-800">{state.oppSetsWon}</span>
                  <button onPointerDown={() => adjustSets("opponent", 1)} className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-xs font-black text-gray-400 hover:bg-gray-200 active:scale-90">+</button>
                  <span className="text-sm font-black text-gray-800">{shortName}</span>
                </div>
              </>
            )}
          </div>

          <button
            onPointerDown={undo}
            disabled={busy}
            className="shrink-0 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 disabled:opacity-40"
          >
            ↩ Undo
          </button>
        </div>
      </div>

      {/* ── Main shot grid ───────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-7 overflow-hidden p-10 pt-4">
        <PlayerColumn
          isServing={leftPlayer === state.nextServer}
          shotBy={leftPlayer}
          opponentName={shortName}
          backhand={leftPlayer === "thom" ? thomBackhand : oppBackhand}
          onBackhandChange={leftPlayer === "thom" ? setThomBackhand : setOppBackhand}
          selectedShot={leftPlayer === "thom" ? thomShot : oppShot}
          onShotSelect={leftPlayer === "thom" ? setThomShot : setOppShot}
          onCommit={(outcome) => handleCommit(leftPlayer, outcome)}
          disabled={busy}
          disableServe={rightPlayer === state.nextServer}
          pointScore={leftPlayer === "thom" ? state.thomSetScore : state.oppSetScore}
          onPointUp={() => addBlankPoint(leftPlayer)}
          onPointDown={undo}
        />
        <PlayerColumn
          isServing={rightPlayer === state.nextServer}
          shotBy={rightPlayer}
          opponentName={shortName}
          backhand={rightPlayer === "thom" ? thomBackhand : oppBackhand}
          onBackhandChange={rightPlayer === "thom" ? setThomBackhand : setOppBackhand}
          selectedShot={rightPlayer === "thom" ? thomShot : oppShot}
          onShotSelect={rightPlayer === "thom" ? setThomShot : setOppShot}
          onCommit={(outcome) => handleCommit(rightPlayer, outcome)}
          disabled={busy}
          disableServe={leftPlayer === state.nextServer}
          pointScore={rightPlayer === "thom" ? state.thomSetScore : state.oppSetScore}
          onPointUp={() => addBlankPoint(rightPlayer)}
          onPointDown={undo}
        />
      </div>
    </div>
  );
}

// ─── Setup Phase ──────────────────────────────────────────────────────────────

function SetupPhase({
  password,
  onMatchCreated,
  onView,
}: {
  password: string;
  onMatchCreated: (info: MatchInfo, state: MatchState) => void;
  onView: (id: string) => void;
}) {
  const [tab, setTab] = useState<"new" | "past">("new");
  const [opponents, setOpponents] = useState<KnownOpponent[]>([]);
  const [opponentQuery, setOpponentQuery] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState<KnownOpponent | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [matchDate, setMatchDate] = useState<string>(() => {
    // Default to today in YYYY-MM-DD (the value format for <input type="date">)
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [tossWinner, setTossWinner] = useState<Player>("thom");
  const [firstServer, setFirstServer] = useState<Player>("thom");
  const [thomSide, setThomSide] = useState<Side>("left");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${password}`, "Content-Type": "application/json" }),
    [password],
  );

  useEffect(() => {
    fetch("/api/leagues/opponents", { headers: headers() })
      .then((r) => r.json())
      .then((d) => setOpponents(d.opponents ?? []))
      .catch(() => {});
  }, [headers]);

  const filtered = opponentQuery.trim()
    ? opponents.filter((o) => o.name.toLowerCase().includes(opponentQuery.toLowerCase()))
    : opponents;

  async function handleCreate() {
    const name = selectedOpponent?.name || opponentQuery.trim();
    if (!name) { setError("Enter opponent name"); return; }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/leagues/recordings", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          opponentName: name,
          opponentUsattId: selectedOpponent?.usattId || undefined,
          thomSide,
          tossWinner,
          firstServer,
          matchDate,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const matchInfo: MatchInfo = {
        id: data.match.id,
        opponentName: data.match.opponentName,
        opponentUsattId: data.match.opponentUsattId,
        thomSide: data.match.thomSide,
        tossWinner: data.match.tossWinner,
        firstServer: data.match.firstServer,
        status: data.match.status,
      };
      // Fetch initial state
      const stateRes = await fetch(`/api/leagues/recordings/${data.match.id}`, {
        headers: headers(),
      });
      const stateData = await stateRes.json();
      onMatchCreated(matchInfo, stateData.state);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create match");
    } finally {
      setCreating(false);
    }
  }

  const oppLabel = opponentQuery.trim() || "Opponent";

  return (
    <div className="mx-auto w-full max-w-md px-6 py-10">
      {/* Tabs */}
      <div className="mb-6 flex gap-2 rounded-xl bg-gray-100 p-1">
        {(["new", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "new" ? "New Match" : "Past Matches"}
          </button>
        ))}
      </div>

      {tab === "past" ? (
        <PastMatchesList password={password} onView={onView} />
      ) : (
      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">New Live Match</h1>

        {/* Opponent */}
        <div className="relative">
          <label className="mb-1 block text-sm font-medium text-gray-700">Opponent</label>
          <input
            type="text"
            value={opponentQuery}
            onChange={(e) => { setOpponentQuery(e.target.value); setSelectedOpponent(null); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Search or enter a new name…"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-900 outline-none focus:border-blue-500"
          />
          {selectedOpponent && (
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">USATT #{selectedOpponent.usattId}</span>
              <button onClick={() => { setSelectedOpponent(null); setOpponentQuery(""); }} className="text-xs text-gray-400 hover:text-gray-600">✕ clear</button>
            </div>
          )}
          {!selectedOpponent && opponentQuery.trim() && (
            <p className="mt-1 text-xs text-amber-600">No USATT ID — will be recorded as pending</p>
          )}
          {showDropdown && filtered.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {filtered.map((o) => (
                <li key={o.usattId} onMouseDown={() => { setSelectedOpponent(o); setOpponentQuery(o.name); setShowDropdown(false); }} className="cursor-pointer px-4 py-3 hover:bg-gray-50">
                  <div className="font-medium text-gray-900">{o.name}</div>
                  <div className="text-xs text-gray-500">USATT #{o.usattId}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Match date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Match Date</label>
          <input
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-900 outline-none focus:border-blue-500"
          />
        </div>

        {/* Toss winner */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Toss Winner</label>
          <div className="flex gap-3">
            {(["thom", "opponent"] as Player[]).map((p) => (
              <button key={p} onClick={() => setTossWinner(p)}
                className={`flex-1 rounded-xl py-3 text-base font-semibold transition-colors ${tossWinner === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                {p === "thom" ? "Thom" : oppLabel}
              </button>
            ))}
          </div>
        </div>

        {/* First server */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">First Server</label>
          <div className="flex gap-3">
            {(["thom", "opponent"] as Player[]).map((p) => (
              <button key={p} onClick={() => setFirstServer(p)}
                className={`flex-1 rounded-xl py-3 text-base font-semibold transition-colors ${firstServer === p ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                {p === "thom" ? "Thom serves" : `${oppLabel} serves`}
              </button>
            ))}
          </div>
        </div>

        {/* Thom's side */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Thom starts on…</label>
          <div className="flex gap-3">
            {(["left", "right"] as Side[]).map((s) => (
              <button key={s} onClick={() => setThomSide(s)}
                className={`flex-1 rounded-xl py-3 text-base font-semibold transition-colors ${thomSide === s ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                {s === "left" ? "← Left" : "Right →"}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

        <button onClick={handleCreate} disabled={creating || !opponentQuery.trim()}
          className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-500 disabled:opacity-50">
          {creating ? "Starting…" : "Start Match"}
        </button>
      </div>
      )}
    </div>
  );
}

interface PastMatch {
  id: string;
  matchDate: string;
  opponentName: string;
  status: string;
  thomSetsWon: number;
  oppSetsWon: number;
}

function fmt(date: string) {
  const [y, m, d] = date.split("T")[0].split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Past match play-by-play viewer ──────────────────────────────────────────

function MatchViewer({
  matchId,
  password,
  onBack,
}: {
  matchId: string;
  password: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<{
    match: { opponentName: string; matchDate: string; firstServer: string; status: string; createdAt: string };
    state: { thomSetsWon: number; oppSetsWon: number; matchComplete: boolean };
    points: unknown[];
  } | null>(null);

  useEffect(() => {
    fetch(`/api/leagues/recordings/${matchId}`, {
      headers: { Authorization: `Bearer ${password}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [matchId, password]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-blue-600 hover:text-blue-800"
      >
        ← Back
      </button>
      <PlayByPlayView
        match={{
          opponentName: data.match.opponentName,
          matchDate: data.match.matchDate,
          firstServer: data.match.firstServer,
          status: data.match.status,
        }}
        state={data.state}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        points={data.points as any}
      />
    </div>
  );
}

function PastMatchesList({
  password,
  onView,
}: {
  password: string;
  onView: (id: string) => void;
}) {
  const [matches, setMatches] = useState<PastMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/leagues/recordings", {
      headers: { Authorization: `Bearer ${password}` },
    })
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []))
      .finally(() => setLoading(false));
  }, [password]);

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/leagues/recordings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.ok) {
        setMatches((prev) => prev.filter((m) => m.id !== id));
        setConfirmDeleteId(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <p className="py-8 text-center text-gray-400">Loading…</p>;
  if (matches.length === 0)
    return <p className="py-8 text-center text-gray-400">No matches recorded yet.</p>;

  return (
    <div className="space-y-2">
      {matches.map((m) => (
        <div key={m.id} className="rounded-xl border border-gray-200 bg-white">
          {confirmDeleteId === m.id ? (
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <p className="text-sm text-gray-700">Delete this match?</p>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center gap-3 px-4 py-3">
              <button
                onClick={() => onView(m.id)}
                className="flex flex-1 min-w-0 items-center gap-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">vs {m.opponentName}</div>
                  <div className="text-xs text-gray-500">{fmt(m.matchDate)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-black tabular-nums text-gray-900">
                    {m.thomSetsWon}–{m.oppSetsWon}
                  </div>
                  <div className={`text-xs font-semibold ${
                    m.status === "complete" ? "text-emerald-600" : "text-amber-500"
                  }`}>
                    {m.status === "complete" ? "Complete" : "In progress"}
                  </div>
                </div>
                <span className="text-gray-300">›</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(m.id); }}
                className="shrink-0 rounded-lg px-2 py-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400"
                title="Delete match"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Auth gate ────────────────────────────────────────────────────────────────

function AuthGate({ onAuth }: { onAuth: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) onAuth(saved);
  }, [onAuth]);

  async function tryAuth() {
    const res = await fetch("/api/leagues/opponents", {
      headers: { Authorization: `Bearer ${pw}` },
    });
    if (res.ok) { sessionStorage.setItem("admin_pw", pw); onAuth(pw); }
    else setError(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Admin Login</h1>
        <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && tryAuth()}
          placeholder="Password"
          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-base outline-none focus:border-blue-500" />
        {error && <p className="text-sm text-red-600">Incorrect password</p>}
        <button onClick={tryAuth} disabled={!pw}
          className="w-full rounded-xl bg-blue-600 py-3 text-base font-bold text-white hover:bg-blue-500 disabled:opacity-50">
          Continue
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LivePage() {
  const [password, setPassword] = useState<string | null>(null);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  if (!password) return <AuthGate onAuth={setPassword} />;

  if (viewingId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MatchViewer
          matchId={viewingId}
          password={password}
          onBack={() => setViewingId(null)}
        />
      </div>
    );
  }

  if (!matchInfo || !matchState) {
    return (
      <SetupPhase
        password={password}
        onMatchCreated={(info, state) => {
          setMatchInfo(info);
          setMatchState(state);
        }}
        onView={setViewingId}
      />
    );
  }

  return (
    <RecordingPhase
      match={matchInfo}
      initialState={matchState}
      password={password}
    />
  );
}
