"use client";

import { useState, useEffect, useCallback } from "react";

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
}

interface KnownOpponent {
  usattId: string;
  name: string;
}

const SHOTS = [
  { key: "serve", label: "Serve" },
  { key: "push",  label: "Push"  },
  { key: "chop",  label: "Chop"  },
  { key: "lob",   label: "Lob"   },
  { key: "block", label: "Block" },
  { key: "drive", label: "Drive" },
  { key: "flick", label: "Flick" },
  { key: "loop",  label: "Loop"  },
  { key: "smash", label: "Smash" },
] as const;
type ShotKey = (typeof SHOTS)[number]["key"];

// ─── Score stepper: number with + above and − below ──────────────────────────

function ScoreStepper({
  value,
  onUp,
  onDown,
  color = "blue",
  size = "md",
}: {
  value: number;
  onUp: () => void;
  onDown: () => void;
  color?: "blue" | "red";
  size?: "md" | "lg";
}) {
  const numClass = size === "lg" ? "text-8xl leading-none" : "text-4xl leading-none";
  const numColor = color === "blue" ? "text-blue-700" : "text-red-600";
  const btnClass =
    "flex items-center justify-center rounded-lg font-black leading-none active:scale-90 " +
    (size === "lg" ? "h-9 w-14 text-xl" : "h-6 w-10 text-xs");
  const btnColor =
    color === "blue"
      ? "bg-blue-100 text-blue-500 hover:bg-blue-200 active:bg-blue-300"
      : "bg-red-100 text-red-400 hover:bg-red-200 active:bg-red-300";

  return (
    <div className="flex flex-col items-center gap-1">
      <button onPointerDown={onUp} className={`${btnClass} ${btnColor}`}>+</button>
      <span className={`min-w-[1.5ch] text-center font-black tabular-nums ${numClass} ${numColor}`}>
        {value}
      </span>
      <button onPointerDown={onDown} className={`${btnClass} ${btnColor}`}>−</button>
    </div>
  );
}

// ─── Shot grid for one player+outcome combination ─────────────────────────────

/**
 * shotBy:   which player hit this shot
 * outcome:  "winner" = shotBy wins the point, "error" = opponent of shotBy wins
 */
function ShotSection({
  shotBy,
  outcome,
  opponentName,
  onTap,
  disabled,
}: {
  shotBy: Player;
  outcome: "winner" | "error";
  opponentName: string;
  onTap: (shotBy: Player, shotType: ShotKey, outcome: "winner" | "error") => void;
  disabled: boolean;
}) {
  const isThom = shotBy === "thom";
  const isWinner = outcome === "winner";

  // Who actually wins the point:
  // - thom winner → thom wins  (blue bright)
  // - thom error  → opp wins   (red muted on thom's side)
  // - opp winner  → opp wins   (red bright)
  // - opp error   → thom wins  (blue muted on opp's side)
  const thomWins = (isThom && isWinner) || (!isThom && !isWinner);

  const bgClass = thomWins
    ? isWinner
      ? "bg-blue-600 hover:bg-blue-500 active:bg-blue-700"
      : "bg-blue-200 hover:bg-blue-300 active:bg-blue-400"
    : isWinner
      ? "bg-red-500 hover:bg-red-400 active:bg-red-600"
      : "bg-red-100 hover:bg-red-200 active:bg-red-300";

  const textClass = thomWins
    ? isWinner
      ? "text-white"
      : "text-blue-900"
    : isWinner
      ? "text-white"
      : "text-red-900";

  const labelClass = thomWins
    ? isWinner
      ? "text-blue-100"
      : "text-blue-600"
    : isWinner
      ? "text-red-100"
      : "text-red-500";

  return (
    <div className="flex flex-1 flex-col">
      {/* Section label */}
      <div className={`py-1 text-center text-xs font-bold uppercase tracking-wider ${labelClass} ${bgClass}`}>
        {isWinner ? "✓ Winner" : "✗ Error"}
      </div>
      {/* 3×3 shot grid (9 buttons) */}
      <div className="grid flex-1 grid-cols-3 grid-rows-3">
        {SHOTS.map(({ key, label }) => (
          <button
            key={key}
            onPointerDown={() => !disabled && onTap(shotBy, key, outcome)}
            disabled={disabled}
            className={`flex flex-col items-center justify-center border border-white/20 transition-all active:scale-95 disabled:opacity-50 ${bgClass} ${textClass}`}
          >
            <span className="text-sm font-bold leading-none md:text-base">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── One player's column (winner+error stacked) ───────────────────────────────

function PlayerColumn({
  shotBy,
  opponentName,
  onTap,
  disabled,
}: {
  shotBy: Player;
  opponentName: string;
  onTap: (shotBy: Player, shotType: ShotKey, outcome: "winner" | "error") => void;
  disabled: boolean;
}) {
  const isThom = shotBy === "thom";
  const headerBg = isThom ? "bg-blue-700" : "bg-red-700";
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl">
      {/* Column header */}
      <div className={`py-2 text-center text-sm font-black uppercase tracking-widest text-white ${headerBg}`}>
        {isThom ? "Thom" : opponentName}
        <span className="ml-1 text-xs font-normal opacity-70">hit last</span>
      </div>
      {/* Winner section */}
      <ShotSection
        shotBy={shotBy}
        outcome="winner"
        opponentName={opponentName}
        onTap={onTap}
        disabled={disabled}
      />
      {/* Error section */}
      <ShotSection
        shotBy={shotBy}
        outcome="error"
        opponentName={opponentName}
        onTap={onTap}
        disabled={disabled}
      />
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

  // ── Record or replace a point ──────────────────────────────────────────────
  async function handleShot(
    shotBy: Player,
    shotType: ShotKey,
    outcome: "winner" | "error",
  ) {
    if (busy) return;
    setBusy(true);
    try {
      // Derive who wins:
      // shotBy=thom & winner → thom; shotBy=thom & error → opponent; etc.
      const thomWins = (shotBy === "thom") === (outcome === "winner");
      const winner: Player = thomWins ? "thom" : "opponent";

      const res = await fetch(`/api/league/admin/live/${match.id}/point`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          winner,
          shotBy,
          shotType,
          pointType: outcome, // "winner" | "error"
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setState(data.state);

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
      const res = await fetch(`/api/league/admin/live/${match.id}/point`, {
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
    const res = await fetch(`/api/league/admin/live/${match.id}/state`, {
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
      const res = await fetch(`/api/league/admin/live/${match.id}/point`, {
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
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-white">
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

  const serveIsThom = state.nextServer === "thom";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white select-none p-3 gap-1">

      {/* ── Set number + serve indicator (thin row) ──────────────────────── */}
      <div className="flex shrink-0 items-center justify-center gap-3 border-b border-gray-100 bg-white py-1">
        <span className={`text-sm font-semibold ${flash === "set" ? "text-yellow-600" : "text-gray-500"}`}>
          {flash === "set" ? "Set complete! →" : `Set ${state.setNumber}`}
        </span>
        <span className="text-gray-300">·</span>
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <span className={`h-2.5 w-2.5 rounded-full ${serveIsThom ? "bg-blue-600" : "bg-red-500"}`} />
          <span>{serveIsThom ? "Thom" : shortName} serves</span>
        </div>
      </div>

      {/* ── Score row: [⇄] [sets] [point score] [sets] [↩] ─────────────── */}
      <div className={`flex shrink-0 items-center px-3 py-3 transition-colors ${flash === "set" ? "bg-yellow-50" : "bg-white"}`}>

        {/* Switch sides — equal-width left anchor */}
        <div className="flex w-20 shrink-0 justify-start">
          <button
            onPointerDown={() => setThomSide(thomSide === "left" ? "right" : "left")}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700"
          >
            ⇄ Sides
          </button>
        </div>

        {/* Centre group — scores */}
        <div className="flex flex-1 items-center justify-center gap-4">

        {/* Left: sets won */}
        <div className="flex flex-col items-center gap-0.5">
          <span className={`text-xs font-bold uppercase tracking-wide ${leftPlayer === "thom" ? "text-blue-700" : "text-red-600"}`}>
            {leftPlayer === "thom" ? "Thom" : shortName}
          </span>
          <ScoreStepper
            value={leftPlayer === "thom" ? state.thomSetsWon : state.oppSetsWon}
            onUp={() => adjustSets(leftPlayer, 1)}
            onDown={() => adjustSets(leftPlayer, -1)}
            color={leftPlayer === "thom" ? "blue" : "red"}
            size="md"
          />
          <span className={`text-[10px] ${leftPlayer === "thom" ? "text-blue-400" : "text-red-400"}`}>sets</span>
        </div>

        {/* Point score */}
        <ScoreStepper
          value={leftPlayer === "thom" ? state.thomSetScore : state.oppSetScore}
          onUp={() => addBlankPoint(leftPlayer)}
          onDown={undo}
          color={leftPlayer === "thom" ? "blue" : "red"}
          size="lg"
        />

        <span className="text-5xl font-thin text-gray-200">—</span>

        <ScoreStepper
          value={rightPlayer === "thom" ? state.thomSetScore : state.oppSetScore}
          onUp={() => addBlankPoint(rightPlayer)}
          onDown={undo}
          color={rightPlayer === "thom" ? "blue" : "red"}
          size="lg"
        />

        {/* Right: sets won */}
        <div className="flex flex-col items-center gap-0.5">
          <span className={`text-xs font-bold uppercase tracking-wide ${rightPlayer === "thom" ? "text-blue-700" : "text-red-600"}`}>
            {rightPlayer === "thom" ? "Thom" : shortName}
          </span>
          <ScoreStepper
            value={rightPlayer === "thom" ? state.thomSetsWon : state.oppSetsWon}
            onUp={() => adjustSets(rightPlayer, 1)}
            onDown={() => adjustSets(rightPlayer, -1)}
            color={rightPlayer === "thom" ? "blue" : "red"}
            size="md"
          />
          <span className={`text-[10px] ${rightPlayer === "thom" ? "text-blue-400" : "text-red-400"}`}>sets</span>
        </div>

        </div>{/* end centre group */}

        {/* Undo — equal-width right anchor */}
        <div className="flex w-20 shrink-0 justify-end">
          <button
            onPointerDown={undo}
            disabled={busy}
            className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-40"
          >
            ↩ Undo
          </button>
        </div>
      </div>

      {/* ── Main shot grid ───────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-1 overflow-hidden rounded-xl">
        <PlayerColumn
          shotBy={leftPlayer}
          opponentName={shortName}
          onTap={handleShot}
          disabled={busy}
        />
        <PlayerColumn
          shotBy={rightPlayer}
          opponentName={shortName}
          onTap={handleShot}
          disabled={busy}
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
    fetch("/api/league/admin/opponents", { headers: headers() })
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
      const res = await fetch("/api/league/admin/live", {
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
      const stateRes = await fetch(`/api/league/admin/live/${data.match.id}`, {
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

interface LivePointRecord {
  id: string;
  setNumber: number;
  pointInSet: number;
  serverThom: boolean;
  thomWon: boolean;
  thomSetScore: number;
  oppSetScore: number;
  thomSetsWon: number;
  oppSetsWon: number;
  setComplete: boolean;
  matchComplete: boolean;
  shotType: string | null;
  shotBy: string | null;
  pointType: string | null;
}

function fmt(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Match Analysis ───────────────────────────────────────────────────────────

function ShotBreakdown({
  byShot,
  color,
}: {
  byShot: Record<string, { winners: number; errors: number }>;
  color: "blue" | "red";
}) {
  const rows = SHOTS
    .map(({ key, label }) => ({ key, label, ...(byShot[key] ?? { winners: 0, errors: 0 }) }))
    .filter((r) => r.winners > 0 || r.errors > 0);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <div className="grid grid-cols-3 border-b border-gray-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <span>Shot</span>
        <span className="text-center">Winners</span>
        <span className="text-center">Errors</span>
      </div>
      {rows.map(({ key, label, winners, errors }, i) => (
        <div
          key={key}
          className={`grid grid-cols-3 items-center px-4 py-2 text-sm ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
        >
          <span className="font-medium capitalize text-gray-700">{label}</span>
          <span className={`text-center font-bold ${color === "blue" ? "text-blue-700" : "text-red-600"}`}>
            {winners}
          </span>
          <span className={`text-center font-bold ${color === "blue" ? "text-blue-300" : "text-red-300"}`}>
            {errors}
          </span>
        </div>
      ))}
    </div>
  );
}

function MatchAnalysis({
  points,
  opponentName,
}: {
  points: LivePointRecord[];
  opponentName: string;
}) {
  const shortOpp = opponentName.split(" ")[0];

  // Only consider points with full shot detail
  const annotated = points.filter((p) => p.shotType && p.pointType);
  if (annotated.length === 0) return null;

  const thomWinners = annotated.filter((p) => p.shotBy === "thom" && p.pointType === "winner").length;
  const thomErrors  = annotated.filter((p) => p.shotBy === "thom" && p.pointType === "error").length;
  const oppWinners  = annotated.filter((p) => p.shotBy === "opponent" && p.pointType === "winner").length;
  const oppErrors   = annotated.filter((p) => p.shotBy === "opponent" && p.pointType === "error").length;

  const thomByShot: Record<string, { winners: number; errors: number }> = {};
  const oppByShot:  Record<string, { winners: number; errors: number }> = {};

  for (const p of annotated) {
    if (!p.shotType) continue;
    const bucket = p.shotBy === "thom" ? thomByShot : oppByShot;
    if (!bucket[p.shotType]) bucket[p.shotType] = { winners: 0, errors: 0 };
    if (p.pointType === "winner") bucket[p.shotType].winners++;
    else if (p.pointType === "error") bucket[p.shotType].errors++;
  }

  // Thom's error % per shot type, sorted worst first
  const thomErrRates = SHOTS
    .map(({ key, label }) => {
      const s = thomByShot[key] ?? { winners: 0, errors: 0 };
      const total = s.winners + s.errors;
      return { key, label, winners: s.winners, errors: s.errors, total, errPct: total > 0 ? Math.round((s.errors / total) * 100) : null };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => (b.errPct ?? 0) - (a.errPct ?? 0));

  return (
    <div className="mt-8 space-y-6 border-t border-gray-100 pt-8">
      <h3 className="text-lg font-black text-gray-900">Match Analysis</h3>

      {/* Per-player summary */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Thom", winners: thomWinners, errors: thomErrors, blue: true },
          { label: shortOpp, winners: oppWinners, errors: oppErrors, blue: false },
        ].map(({ label, winners, errors, blue }) => (
          <div key={label} className={`rounded-xl p-4 ${blue ? "bg-blue-50" : "bg-red-50"}`}>
            <div className={`mb-2 text-sm font-bold uppercase tracking-wide ${blue ? "text-blue-700" : "text-red-700"}`}>
              {label}
            </div>
            <div className="flex gap-6">
              <div>
                <div className={`text-2xl font-black ${blue ? "text-blue-800" : "text-red-800"}`}>{winners}</div>
                <div className="text-xs text-gray-500">winners</div>
              </div>
              <div>
                <div className={`text-2xl font-black ${blue ? "text-blue-400" : "text-red-400"}`}>{errors}</div>
                <div className="text-xs text-gray-500">errors</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Thom — by shot type */}
      {Object.keys(thomByShot).length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
            Thom — by shot type
          </h4>
          <ShotBreakdown byShot={thomByShot} color="blue" />
        </div>
      )}

      {/* Opponent — by shot type */}
      {Object.keys(oppByShot).length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
            {shortOpp} — by shot type
          </h4>
          <ShotBreakdown byShot={oppByShot} color="red" />
        </div>
      )}

      {/* Error % per shot type — practice guide */}
      {thomErrRates.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
            Thom — error % by shot (what to practice)
          </h4>
          <div className="overflow-hidden rounded-xl border border-gray-100">
            {thomErrRates.map(({ key, label, winners, errors, errPct }, i) => (
              <div
                key={key}
                className={`flex items-center gap-3 px-4 py-2.5 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
              >
                <span className="w-14 font-medium capitalize text-gray-700">{label}</span>
                <div className="min-w-0 flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${(errPct ?? 0) >= 50 ? "bg-red-400" : "bg-amber-300"}`}
                      style={{ width: `${errPct ?? 0}%` }}
                    />
                  </div>
                </div>
                <span
                  className={`w-10 text-right text-sm font-black tabular-nums ${(errPct ?? 0) >= 50 ? "text-red-600" : "text-gray-700"}`}
                >
                  {errPct}%
                </span>
                <span className="w-20 text-right text-xs tabular-nums text-gray-400">
                  {winners}W / {errors}E
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Past match list + play-by-play viewer ────────────────────────────────────

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
    match: { opponentName: string; matchDate: string; firstServer: string };
    state: MatchState;
    points: LivePointRecord[];
  } | null>(null);

  useEffect(() => {
    fetch(`/api/league/admin/live/${matchId}`, {
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

  const { match, points } = data;

  // Group points by set
  const sets: Record<number, LivePointRecord[]> = {};
  for (const p of points) {
    if (!sets[p.setNumber]) sets[p.setNumber] = [];
    sets[p.setNumber].push(p);
  }
  const setNumbers = Object.keys(sets)
    .map(Number)
    .sort((a, b) => a - b);

  const shotLabel = (p: LivePointRecord) => {
    if (!p.shotType && !p.pointType) return null;
    const by = p.shotBy === "thom" ? "Thom" : match.opponentName.split(" ")[0];
    const shot = p.shotType ? p.shotType.replace("_", " ") : "";
    const type = p.pointType === "winner" ? "winner" : p.pointType === "error" ? "error" : "";
    if (shot && type) return `${shot} ${type} by ${by}`;
    if (shot) return `${shot} by ${by}`;
    return null;
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-blue-600 hover:text-blue-800"
      >
        ← Back
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900">
          Thom vs {match.opponentName}
        </h2>
        <p className="text-sm text-gray-500">{fmt(match.matchDate)}</p>
        <p className="mt-1 text-lg font-bold text-gray-700">
          {data.state.thomSetsWon} – {data.state.oppSetsWon} sets
        </p>
        {data.state.matchComplete && (
          <div className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-base font-black ${
            data.state.thomSetsWon > data.state.oppSetsWon
              ? "bg-blue-600 text-white"
              : "bg-red-500 text-white"
          }`}>
            {data.state.thomSetsWon > data.state.oppSetsWon
              ? "🏆 Thom won"
              : `${match.opponentName.split(" ")[0]} won`}
          </div>
        )}
      </div>

      {setNumbers.map((setNum) => {
        const setPoints = sets[setNum];
        const last = setPoints[setPoints.length - 1];
        const thomSetScore = last?.thomSetScore ?? 0;
        const oppSetScore = last?.oppSetScore ?? 0;
        return (
          <div key={setNum} className="mb-6">
            <div className="mb-2 flex items-center gap-3">
              <span className="text-sm font-bold uppercase tracking-wide text-gray-500">
                Set {setNum}
              </span>
              <span className="text-sm font-black text-gray-900">
                {thomSetScore} – {oppSetScore}
              </span>
              {last?.setComplete && (
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  thomSetScore > oppSetScore
                    ? "bg-blue-50 text-blue-700"
                    : "bg-red-50 text-red-600"
                }`}>
                  {thomSetScore > oppSetScore ? "Thom" : match.opponentName.split(" ")[0]}
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-100">
              {setPoints.map((p, i) => {
                const label = shotLabel(p);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2 text-sm ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    {/* Point # */}
                    <span className="w-5 shrink-0 text-right text-xs text-gray-400">
                      {p.pointInSet}
                    </span>

                    {/* Server dot */}
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        p.serverThom ? "bg-blue-500" : "bg-red-400"
                      }`}
                      title={p.serverThom ? "Thom serves" : `${match.opponentName.split(" ")[0]} serves`}
                    />

                    {/* Winner */}
                    <span
                      className={`w-20 shrink-0 font-semibold ${
                        p.thomWon ? "text-blue-700" : "text-red-600"
                      }`}
                    >
                      {p.thomWon ? "Thom" : match.opponentName.split(" ")[0]}
                    </span>

                    {/* Shot detail */}
                    <span className="flex-1 capitalize text-gray-500">
                      {label ?? <span className="italic text-gray-300">—</span>}
                    </span>

                    {/* Score after */}
                    <span className="shrink-0 tabular-nums text-gray-400">
                      {p.thomSetScore}–{p.oppSetScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {points.length === 0 && (
        <p className="text-center text-gray-400">No points recorded yet.</p>
      )}

      {points.length > 0 && <MatchAnalysis points={points} opponentName={match.opponentName} />}
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

  useEffect(() => {
    fetch("/api/league/admin/live", {
      headers: { Authorization: `Bearer ${password}` },
    })
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []))
      .finally(() => setLoading(false));
  }, [password]);

  if (loading) return <p className="py-8 text-center text-gray-400">Loading…</p>;
  if (matches.length === 0)
    return <p className="py-8 text-center text-gray-400">No matches recorded yet.</p>;

  return (
    <div className="space-y-2">
      {matches.map((m) => (
        <button
          key={m.id}
          onClick={() => onView(m.id)}
          className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:bg-gray-50"
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
    const res = await fetch("/api/league/admin/opponents", {
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
