"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface LivePoint {
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

interface MatchSummary {
  opponentName: string;
  matchDate: string;
  firstServer: string;
  status?: string;
}

interface MatchStateSummary {
  thomSetsWon: number;
  oppSetsWon: number;
  matchComplete: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function shotLabel(p: LivePoint, opponentName: string): string | null {
  if (!p.shotType && !p.pointType) return null;
  const by = p.shotBy === "thom" ? "Thom" : opponentName.split(" ")[0];
  const shot = p.shotType ? p.shotType.replace("_", " ") : "";
  const type = p.pointType === "winner" ? "winner" : p.pointType === "error" ? "error" : "";
  if (shot && type) return `${shot} ${type} by ${by}`;
  if (shot) return `${shot} by ${by}`;
  return null;
}

// ─── Shot breakdown table ─────────────────────────────────────────────────────

function ShotBreakdown({
  byShot,
  color,
}: {
  byShot: Record<string, { winners: number; errors: number }>;
  color: "blue" | "red";
}) {
  const rows = SHOTS
    .map(({ key, label }) => ({ key, label, ...(byShot[key] ?? { winners: 0, errors: 0 }) }));

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

// ─── Match analysis ───────────────────────────────────────────────────────────

function MatchAnalysis({ points, opponentName }: { points: LivePoint[]; opponentName: string }) {
  const shortOpp = opponentName.split(" ")[0];
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

  return (
    <div className="mt-8 space-y-6 border-t border-gray-100 pt-8">
      <h3 className="text-lg font-black text-gray-900">Match Analysis</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Thom column: summary + shot breakdown */}
        <div className="space-y-2">
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-700">Thom</div>
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-black text-blue-800">{thomWinners}</div>
                <div className="text-xs text-gray-500">winners</div>
              </div>
              <div>
                <div className="text-2xl font-black text-blue-400">{thomErrors}</div>
                <div className="text-xs text-gray-500">errors</div>
              </div>
            </div>
          </div>
          {Object.keys(thomByShot).length > 0 && (
            <ShotBreakdown byShot={thomByShot} color="blue" />
          )}
        </div>

        {/* Opponent column: summary + shot breakdown */}
        <div className="space-y-2">
          <div className="rounded-xl bg-red-50 p-4">
            <div className="mb-2 text-sm font-bold uppercase tracking-wide text-red-700">{shortOpp}</div>
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-black text-red-800">{oppWinners}</div>
                <div className="text-xs text-gray-500">winners</div>
              </div>
              <div>
                <div className="text-2xl font-black text-red-400">{oppErrors}</div>
                <div className="text-xs text-gray-500">errors</div>
              </div>
            </div>
          </div>
          {Object.keys(oppByShot).length > 0 && (
            <ShotBreakdown byShot={oppByShot} color="red" />
          )}
        </div>
      </div>

    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlayByPlayView({
  match,
  state,
  points,
}: {
  match: MatchSummary;
  state: MatchStateSummary;
  points: LivePoint[];
}) {
  const shortOpp = match.opponentName.split(" ")[0];

  // Group points by set
  const sets: Record<number, LivePoint[]> = {};
  for (const p of points) {
    if (!sets[p.setNumber]) sets[p.setNumber] = [];
    sets[p.setNumber].push(p);
  }
  const setNumbers = Object.keys(sets).map(Number).sort((a, b) => a - b);

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-gray-900">
              Thom vs {match.opponentName}
            </h2>
            <p className="text-xs text-gray-400">{fmt(match.matchDate)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-lg font-black tabular-nums text-gray-800">
              {state.thomSetsWon} – {state.oppSetsWon}
            </span>
            <span className="text-xs text-gray-400">sets</span>
            {state.matchComplete && (
              <span className={`rounded-lg px-2 py-1 text-xs font-black ${
                state.thomSetsWon > state.oppSetsWon
                  ? "bg-blue-600 text-white"
                  : "bg-red-500 text-white"
              }`}>
                {state.thomSetsWon > state.oppSetsWon ? "🏆 Thom" : `${shortOpp}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Per-set point log */}
      <div className="mt-5" />
      {setNumbers.map((setNum) => {
        const setPoints = sets[setNum];
        const last = setPoints[setPoints.length - 1];
        const thomSetScore = last?.thomSetScore ?? 0;
        const oppSetScore  = last?.oppSetScore  ?? 0;
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
                  thomSetScore > oppSetScore ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-600"
                }`}>
                  {thomSetScore > oppSetScore ? "Thom" : shortOpp}
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-100">
              {setPoints.map((p, i) => {
                const label = shotLabel(p, match.opponentName);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2 text-sm ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <span className="w-5 shrink-0 text-right text-xs text-gray-400">{p.pointInSet}</span>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${p.serverThom ? "bg-blue-500" : "bg-red-400"}`}
                      title={p.serverThom ? "Thom serves" : `${shortOpp} serves`}
                    />
                    <span className={`w-20 shrink-0 font-semibold ${p.thomWon ? "text-blue-700" : "text-red-600"}`}>
                      {p.thomWon ? "Thom" : shortOpp}
                    </span>
                    <span className="flex-1 capitalize text-gray-500">
                      {label ?? <span className="italic text-gray-300">—</span>}
                    </span>
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

      {points.length > 0 && (
        <MatchAnalysis points={points} opponentName={match.opponentName} />
      )}
    </div>
  );
}
