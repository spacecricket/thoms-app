/**
 * OmniPong tournament → USATT rating predictor.
 *
 * Algorithm: "USATT Ratings System Explained" (August 7, 2025)
 *   1. Rating Points Exchange Chart  - per-match points
 *   2. Pass 1                        - "adjusted rating" for underrated players
 *   3. Pass 2                        - initial rating for unrated players
 *   4. Final pass                    - accumulate every match on top of that
 *
 * OmniPong is classic server-rendered ASP, so no browser is needed:
 *   T-tourney.asp?t=100&r=<id>            players by name (seed rating = starting rating)
 *   T-tourney.asp?t=109&r=<id>&h=&p=<p>   one player's wins + losses (singles only)
 */

export const OMNIPONG_BASE = "https://omnipong.com/T-tourney.asp";

// |Rating differential| points exchanged when the HIGHER rated player wins / when the LOWER rated player wins.
const CHART: { max: number; higher: number; lower: number }[] = [
  { max: 12, higher: 8, lower: 8 },
  { max: 37, higher: 7, lower: 10 },
  { max: 62, higher: 6, lower: 13 },
  { max: 87, higher: 5, lower: 16 },
  { max: 112, higher: 4, lower: 20 },
  { max: 137, higher: 3, lower: 25 },
  { max: 162, higher: 2, lower: 30 },
  { max: 187, higher: 2, lower: 35 },
  { max: 212, higher: 1, lower: 40 },
  { max: 237, higher: 1, lower: 45 },
  { max: Number.POSITIVE_INFINITY, higher: 0, lower: 50 },
];

/** Points the winner gains (and the loser drops) for one match. */
export function exchangePoints(winnerRating: number, loserRating: number): number {
  const diff = Math.abs(winnerRating - loserRating);
  const row = CHART.find((r) => diff <= r.max)!;
  return winnerRating >= loserRating ? row.higher : row.lower;
}

/**
 * Accepts either a bare id or the OmniPong tournament page URL, e.g.
 * `https://omnipong.com/T-tourney.asp?t=100&r=6328`, and returns the `r` value.
 */
export function tournamentIdFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;

  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withScheme);
    if (!/(^|\.)omnipong\.com$/i.test(url.hostname)) return null;
    const r = url.searchParams.get("r");
    return r && /^\d+$/.test(r) ? r : null;
  } catch {
    return null;
  }
}

export type AdjustmentKind = "none" | "standard" | "special" | "initial";

export interface TournamentPlayer {
  id: string;
  name: string;
  /** Pre-tournament rating; 0 means unrated. */
  seed: number;
  /** Eligibility rating (second number in "Seed / Elig"). */
  elig: number;
}

export interface TournamentMatch {
  playerId: string;
  opponentId: string;
  opponentName: string;
  /** Opponent's pre-tournament rating (0 = unrated). */
  opponentRating: number;
  eventId: string;
  eventName: string;
  format: string;
  scores: string;
  won: boolean;
}

export interface PlayerRating {
  id: string;
  name: string;
  initialRating: number;
  wins: number;
  losses: number;
  adjustment: AdjustmentKind;
  /** Starting rating for the final pass (adjusted when granted, initial when unrated). */
  adjustedRating: number | null;
  finalRating: number | null;
  ratingChange: number | null;
  /** True when an input rating had to be inferred (see notes). */
  uncertain: boolean;
  notes: string[];
}

export interface TournamentRatings {
  tournament: { id: string; name: string };
  generatedAt: string;
  players: PlayerRating[];
  summary: {
    players: number;
    matches: number;
    /** Matches that were not listed on both players' result pages (should be 0). */
    unmatchedMatches: number;
    adjusted: number;
    unrated: number;
    unresolved: number;
    uncertain: number;
  };
}

export interface FetchHtml {
  (cacheKey: string, url: string): Promise<string>;
}

const defaultFetchHtml: FetchHtml = async (_cacheKey, url) => {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (thoms-app tournament rating predictor)" },
  });
  if (!res.ok) throw new Error(`OmniPong returned ${res.status} for ${url}`);
  return res.text();
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// ── Parsing ──────────────────────────────────────────────────────────────────

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();

export function parsePlayerList(html: string): { name: string; players: TournamentPlayer[] } {
  const titleMatch = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  const rawTitle = titleMatch ? decode(titleMatch[1].replace(/<[^>]+>/g, " ")) : "";
  const name = rawTitle.replace(/\s*-\s*Players by Name\s*$/i, "").trim();

  const rowRe =
    /<td Align="Left">\s*<a href="T-tourney\.asp\?t=\d+&r=\d+&h=&p=(\d+)"[^>]*>([^<]*)<\/a>\s*<\/td>\s*<td Align="Center">[^<]*<\/td>\s*<td Align="Left">[^<]*<\/td>\s*<td Align="Center">([^<]*)<\/td>/g;

  const players: TournamentPlayer[] = [];
  for (const m of html.matchAll(rowRe)) {
    const [, id, rawName, ratings] = m;
    const [seed, elig] = ratings.split("/").map((v) => Number(v.trim()));
    players.push({ id, name: decode(rawName).replace(/^-/, ""), seed, elig });
  }
  return { name, players };
}

export function parsePlayerMatches(html: string, playerId: string): TournamentMatch[] {
  const lossesAt = html.indexOf("Losses<table");
  const sections = [
    { html: lossesAt >= 0 ? html.slice(0, lossesAt) : html, won: true },
    { html: lossesAt >= 0 ? html.slice(lossesAt) : "", won: false },
  ];

  // NB: players without a USATT number render their # cell as
  // <td align="center" valign="top">&nbsp;</td>, so don't match on Align="Center" there.
  const rowRe =
    /<td Align="Left">\s*<a href="T-tourney\.asp\?t=\d+&r=\d+&h=&p=(\d+)"[^>]*>([^<]*)<\/a>\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td Align="Center">([^<]*)<\/td>\s*<td Align="Center">([^<]*)<\/td>\s*<td Align="Left">\s*<a href="[^"]*ev=(\d+)&st=\d+"[^>]*>([^<]*)<\/a>\s*<\/td>\s*<td Align="Left">([^<]*)<\/td>/g;

  const matches: TournamentMatch[] = [];
  for (const section of sections) {
    for (const m of section.html.matchAll(rowRe)) {
      const [, opponentId, opponentName, , ratingText, format, eventId, eventName, scores] = m;
      matches.push({
        playerId,
        opponentId,
        opponentName: decode(opponentName),
        opponentRating: /^\d+$/.test(ratingText.trim()) ? Number(ratingText.trim()) : 0,
        eventId,
        eventName: decode(eventName),
        format: format.trim(),
        scores: decode(scores),
        won: section.won,
      });
    }
  }
  return matches;
}

// ── USATT calculation ────────────────────────────────────────────────────────

/**
 * Special Adjustment (and pass-2's "same best wins / worst losses formula").
 * When every loss is rated at or above the best win, the adjusted rating is the
 * average of the two best wins. Otherwise wins are ranked descending, losses
 * ascending and paired; each pair is folded into a cumulative mean until a pair
 * is no longer usable (Examples 1-3 in the USATT document).
 */
export function specialAdjusted(winRatings: number[], lossRatings: number[]): number {
  const wins = [...winRatings].sort((a, b) => b - a);
  if (wins.length === 0) return 0;
  if (lossRatings.length === 0) return Math.round(mean(wins.slice(0, 2)));

  const losses = [...lossRatings].sort((a, b) => a - b);
  const bestWin = wins[0];
  if (!losses.some((l) => l < bestWin)) return Math.round(mean(wins.slice(0, 2)));

  const kept: number[] = [];
  const pairs = Math.min(wins.length, losses.length);
  for (let i = 0; i < pairs; i++) {
    const win = wins[i];
    const loss = losses[i];
    if (loss > win) break; // pair is out of order: stop, exclude it
    kept.push(win, loss);
    if (i === 0) continue;
    const cm = mean(kept);
    if (win > cm && loss > cm) {
      kept.pop(); // this loss would only inflate the adjusted rating
      break;
    }
    if (win < cm && loss < cm) {
      kept.splice(kept.length - 2, 1); // this win would only deflate it
      break;
    }
  }
  return Math.round(mean(kept));
}

export function calculateRatings(
  players: TournamentPlayer[],
  matchesByPlayer: Map<string, TournamentMatch[]>,
): PlayerRating[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const rated = (id: string) => (byId.get(id)?.seed ?? 0) > 0;

  // ── Pass 1: adjusted ratings for rated players (rated-vs-rated matches only)
  type Pass1 = { net: number; wins20: number; wins50: number; fiftyDiffs: number[]; winRatings: number[]; lossRatings: number[] };
  const pass1 = new Map<string, Pass1>();
  for (const player of players) {
    if (player.seed <= 0) continue;
    const acc: Pass1 = { net: 0, wins20: 0, wins50: 0, fiftyDiffs: [], winRatings: [], lossRatings: [] };
    for (const match of matchesByPlayer.get(player.id) ?? []) {
      if (!rated(match.opponentId) || match.opponentRating <= 0) continue;
      if (match.won) {
        const pts = exchangePoints(player.seed, match.opponentRating);
        acc.net += pts;
        acc.winRatings.push(match.opponentRating);
        if (pts >= 20) acc.wins20++;
        if (pts >= 50) {
          acc.wins50++;
          acc.fiftyDiffs.push(match.opponentRating - player.seed);
        }
      } else {
        acc.net -= exchangePoints(match.opponentRating, player.seed);
        acc.lossRatings.push(match.opponentRating);
      }
    }
    pass1.set(player.id, acc);
  }

  const startRatings = new Map<string, number>();
  const startRatingsEstimated = new Set<string>();
  const adjustmentOf = new Map<string, AdjustmentKind>();
  const notesById = new Map<string, string[]>();
  const addNote = (id: string, note: string) => {
    const existing = notesById.get(id);
    if (existing) existing.push(note);
    else notesById.set(id, [note]);
  };

  for (const player of players) {
    if (player.seed <= 0) continue;
    const acc = pass1.get(player.id)!;

    const special =
      acc.net >= 150 ||
      acc.wins50 >= 3 ||
      (acc.wins50 === 2 && acc.fiftyDiffs.reduce((a, b) => a + b, 0) >= 700);
    const standard = acc.net >= 60 || (acc.net >= 40 && acc.wins20 >= 2);

    if (special) {
      startRatings.set(player.id, specialAdjusted(acc.winRatings, acc.lossRatings));
      adjustmentOf.set(player.id, "special");
    } else if (standard) {
      startRatings.set(player.id, player.seed + acc.net);
      adjustmentOf.set(player.id, "standard");
    } else {
      startRatings.set(player.id, player.seed);
      adjustmentOf.set(player.id, "none");
    }
  }

  // ── Pass 2: initial ratings for unrated players (unrated-vs-rated matches only)
  for (const player of players) {
    if (player.seed > 0) continue;
    const vsRated = (matchesByPlayer.get(player.id) ?? []).filter(
      (m) => m.opponentRating > 0 && rated(m.opponentId),
    );
    if (vsRated.length === 0) {
      addNote(player.id, "unrated: no matches against rated players");
      continue;
    }
    const winRatings = vsRated.filter((m) => m.won).map((m) => m.opponentRating);
    const lossRatings = vsRated.filter((m) => !m.won).map((m) => m.opponentRating);

    let initial: number;
    if (winRatings.length === 0 || lossRatings.length === 0) {
      // USATT uses the Estimated Rating the tournament director supplies with the
      // entry. OmniPong does not publish it, so fall back to the bound the
      // estimate is required to satisfy and flag the player.
      initial = winRatings.length > 0 ? Math.max(...winRatings) : Math.min(...lossRatings);
      addNote(
        player.id,
        `unrated initial rating estimated from opponents (${winRatings.length}W/${lossRatings.length}L vs rated)`,
      );
      startRatingsEstimated.add(player.id);
    } else {
      const bestWin = Math.max(...winRatings);
      const worstLoss = Math.max(...lossRatings);
      initial = worstLoss >= bestWin ? bestWin : specialAdjusted(winRatings, lossRatings);
      addNote(player.id, "unrated: initial rating derived from results");
    }
    startRatings.set(player.id, Math.max(200, initial));
    adjustmentOf.set(player.id, "initial");
  }

  // ── Final pass: accumulate every match on top of the starting rating
  return players.map((player) => {
    const matches = matchesByPlayer.get(player.id) ?? [];
    const wins = matches.filter((m) => m.won).length;
    const losses = matches.length - wins;
    const start = startRatings.get(player.id) ?? null;
    const adjustment = adjustmentOf.get(player.id) ?? "initial";

    let final: number | null = null;
    let uncertain = startRatingsEstimated.has(player.id);

    if (start !== null) {
      let delta = 0;
      let skipped = 0;
      for (const match of matches) {
        const opponent = startRatings.get(match.opponentId);
        if (opponent === undefined) {
          // Unrated opponent whose initial rating cannot be derived: USATT would
          // halt ratings processing here, so skip the match and flag it.
          skipped++;
          continue;
        }
        if (startRatingsEstimated.has(match.opponentId)) uncertain = true;
        if (match.won) {
          delta += exchangePoints(start, opponent);
        } else {
          const lost = exchangePoints(opponent, start);
          // Ratings below 100 can only lose 3 points in a single match.
          delta -= start < 100 ? Math.min(lost, 3) : lost;
        }
      }
      final = start + delta;
      if (skipped > 0) {
        addNote(player.id, `${skipped} match(es) against unrated opponents skipped`);
      }
    }

    return {
      id: player.id,
      name: player.name,
      initialRating: player.seed,
      wins,
      losses,
      adjustment,
      adjustedRating: start,
      finalRating: final,
      ratingChange:
        final === null
          ? null
          : final - (player.seed > 0 ? player.seed : (start ?? player.seed)),
      uncertain,
      notes: notesById.get(player.id) ?? [],
    };
  });
}

// ── Orchestration ────────────────────────────────────────────────────────────

const PREDICTION_TTL_MS = 10 * 60 * 1000;
const predictionCache = new Map<string, { at: number; data: TournamentRatings }>();

/**
 * Same as predictTournamentRatings, with a per-process TTL cache. A cold run
 * fetches one OmniPong page per player, so this keeps repeat views cheap for both
 * the API route and the server-rendered page.
 */
export async function predictTournamentRatingsCached(
  tournamentId: string,
  ttlMs = PREDICTION_TTL_MS,
): Promise<{ data: TournamentRatings; cached: boolean }> {
  const hit = predictionCache.get(tournamentId);
  if (hit && Date.now() - hit.at < ttlMs) return { data: hit.data, cached: true };

  const data = await predictTournamentRatings(tournamentId);
  predictionCache.set(tournamentId, { at: Date.now(), data });
  return { data, cached: false };
}

export async function predictTournamentRatings(
  tournamentId: string,
  options: { fetchHtml?: FetchHtml; concurrency?: number } = {},
): Promise<TournamentRatings> {
  const fetchHtml = options.fetchHtml ?? defaultFetchHtml;
  const concurrency = options.concurrency ?? 4;

  const listHtml = await fetchHtml("players", `${OMNIPONG_BASE}?t=100&r=${tournamentId}&h=`);
  const { name, players } = parsePlayerList(listHtml);
  if (players.length === 0) {
    throw new Error(`No players found for tournament ${tournamentId} (is the id correct?)`);
  }

  const pages = await mapLimit(players, concurrency, (p) =>
    fetchHtml(`p-${p.id}`, `${OMNIPONG_BASE}?t=109&r=${tournamentId}&h=&p=${p.id}`).then(
      (html) => parsePlayerMatches(html, p.id),
    ),
  );

  const matchesByPlayer = new Map<string, TournamentMatch[]>();
  players.forEach((p, i) => matchesByPlayer.set(p.id, pages[i]));
  const allMatches = pages.flat();

  // Every match appears once on each player's page; use that as an integrity check.
  const seen = new Map<string, number>();
  for (const m of allMatches) {
    const key = [[m.playerId, m.opponentId].sort().join(">"), m.eventId, m.format, m.scores].join("|");
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const unmatchedMatches = [...seen.values()].filter((n) => n !== 2).length;

  const results = calculateRatings(players, matchesByPlayer);

  return {
    tournament: { id: tournamentId, name },
    generatedAt: new Date().toISOString(),
    players: results,
    summary: {
      players: results.length,
      matches: seen.size,
      unmatchedMatches,
      adjusted: results.filter((r) => r.adjustment === "standard" || r.adjustment === "special").length,
      unrated: results.filter((r) => r.initialRating === 0).length,
      unresolved: results.filter((r) => r.finalRating === null).length,
      uncertain: results.filter((r) => r.uncertain).length,
    },
  };
}
