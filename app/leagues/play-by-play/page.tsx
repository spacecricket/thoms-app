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
}

interface KnownOpponent {
  usattId: string;
  name: string;
}

const SHOTS = [
  { key: "serve",   label: "Serve"   },
  { key: "push",    label: "Push"    },
  { key: "chop",    label: "Chop"    },
  { key: "lob",     label: "Lob"     },
  { key: "block",   label: "Block"   },
  { key: "drive",   label: "Drive"   },
  { key: "flick",   label: "Flick"   },
  { key: "loop",    label: "Loop"    },
  { key: "counter", label: "Counter" },
  { key: "drop",    label: "Drop"    },
  { key: "smash",   label: "Smash"   },
  { key: "unknown", label: "Unknown"  },
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
  const numClass = size === "lg" ? "text-5xl leading-none" : "text-2xl leading-none";
  const numColor = color === "blue" ? "text-blue-700" : "text-red-600";
  const btnClass =
    "flex items-center justify-center rounded-lg font-black leading-none active:scale-90 " +
    (size === "lg" ? "h-9 w-14 text-xl" : "h-6 w-10 text-xs");
  const btnColor = "bg-gray-100 text-gray-400 hover:bg-gray-200 active:bg-gray-300";

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
  onTap,
  disabled,
}: {
  shotBy: Player;
  outcome: "winner" | "error";
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
      {/* 3×4 shot grid (12 buttons) */}
      <div className="grid flex-1 grid-cols-3 grid-rows-4">
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
  backhand,
  onBackhandChange,
  onTap,
  disabled,
}: {
  shotBy: Player;
  opponentName: string;
  backhand: boolean | null;
  onBackhandChange: (value: boolean | null) => void;
  onTap: (shotBy: Player, shotType: ShotKey, outcome: "winner" | "error") => void;
  disabled: boolean;
}) {
  const isThom = shotBy === "thom";
  const headerBg = isThom ? "bg-blue-700" : "bg-red-700";
  const activeBtn = isThom
    ? "bg-white text-blue-800 shadow-lg scale-105"
    : "bg-white text-red-700 shadow-lg scale-105";
  const inactiveBtn = "bg-white/15 text-white/50 hover:bg-white/25 hover:text-white/80";

  function toggleHand(val: boolean) {
    onBackhandChange(backhand === val ? null : val);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl">
      {/* Column header */}
      <div className={`${headerBg} px-2 pt-2 pb-2`}>
        <div className="mb-1 text-center text-sm font-black uppercase tracking-widest text-white">
          {isThom ? "Thom" : opponentName}
          <span className="ml-1 text-xs font-normal opacity-70">ending shot</span>
        </div>
        <div className="flex gap-2 px-1 pb-1">
          <button
            onPointerDown={() => toggleHand(true)}
            className={`flex-1 rounded-lg py-2 text-sm font-black uppercase tracking-widest transition-all active:scale-95 ${backhand === true ? activeBtn : inactiveBtn}`}
          >
            BH
          </button>
          <button
            onPointerDown={() => toggleHand(false)}
            className={`flex-1 rounded-lg py-2 text-sm font-black uppercase tracking-widest transition-all active:scale-95 ${backhand === false ? activeBtn : inactiveBtn}`}
          >
            FH
          </button>
        </div>
      </div>
      {/* Winner section */}
      <ShotSection
        shotBy={shotBy}
        outcome="winner"
        onTap={onTap}
        disabled={disabled}
      />
      {/* Error section */}
      <ShotSection
        shotBy={shotBy}
        outcome="error"
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
  const [thomBackhand, setThomBackhand] = useState<boolean | null>(null);
  const [oppBackhand, setOppBackhand] = useState<boolean | null>(null);

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

      const backhand = shotBy === "thom" ? thomBackhand : oppBackhand;

      const res = await fetch(`/api/leagues/recordings/${match.id}/points`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          winner,
          shotBy,
          shotType,
          pointType: outcome, // "winner" | "error"
          backhand,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setState(data.state);
      setThomBackhand(null);
      setOppBackhand(null);

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
        <div className="flex flex-1 items-center justify-center gap-6">

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
          backhand={leftPlayer === "thom" ? thomBackhand : oppBackhand}
          onBackhandChange={leftPlayer === "thom" ? setThomBackhand : setOppBackhand}
          onTap={handleShot}
          disabled={busy}
        />
        <PlayerColumn
          shotBy={rightPlayer}
          opponentName={shortName}
          backhand={rightPlayer === "thom" ? thomBackhand : oppBackhand}
          onBackhandChange={rightPlayer === "thom" ? setThomBackhand : setOppBackhand}
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
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

  useEffect(() => {
    fetch("/api/leagues/recordings", {
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
