import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import type { Page } from "playwright";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const WEBLET_BASE =
  "https://justgousatt2-dpedf8b3ekgef0fh.centralus-01.azurewebsites.net" +
  "/weblets/load/Result/b11c2cb7-130d-4274-bf68-ca7b5ffb19ac" +
  "/FA4D9651-1327-40DF-BFB9-7A6768AD4931";

interface OmniPongPlayer {
  first: string;
  last: string;
  name: string;
  seedRating: number | null;
}

export interface PlayerResult extends OmniPongPlayer {
  leagueRating: number | null;
  tournamentRating: number | null;
}

async function parseOmniPong(
  url: string,
): Promise<{ title: string; players: OmniPongPlayer[]; ratingCap: number | null }> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`OmniPong fetch failed: ${res.status}`);
  const html = await res.text();

  const titleMatch = html.match(/<h3[^>]*>(.*?)<\/h3>/is);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "Unknown Event";

  // "Spttc Sunday League U-1300 5/3" → 1300 (used to filter out wrong-person matches
  // when multiple USATT profiles share a name and the player's seed rating is 0/missing).
  const capMatch = title.match(/\bu-?(\d{3,4})\b/i);
  const ratingCap = capMatch ? Number(capMatch[1]) : null;

  // Each player row: <a href="...t=109...">-Last, First</a></td> then 2 <td>s then seed rating <td>
  const linkRe =
    /<a[^>]+href="[^"]*t=109[^"]*"[^>]*>-([^<]+)<\/a><\/td>(?:<td[^>]*>[^<]*<\/td>){2}<td[^>]*>(\d+)<\/td>/gi;

  const players: OmniPongPlayer[] = [];
  for (const m of html.matchAll(linkRe)) {
    const rawName = m[1].trim(); // "Zeitlin, Eli"
    const seedRating = Number(m[2]) || null;
    const commaIdx = rawName.indexOf(", ");
    const last = commaIdx !== -1 ? rawName.slice(0, commaIdx).trim() : rawName;
    const first = commaIdx !== -1 ? rawName.slice(commaIdx + 2).trim() : "";
    const name = first ? `${first} ${last}` : last;
    players.push({ first, last, name, seedRating });
  }

  return { title, players, ratingCap };
}

async function findProfileUrls(page: Page, first: string, last: string): Promise<string[]> {
  await page.goto(
    `${WEBLET_BASE}/ranking?search=${encodeURIComponent(`${first} ${last}`)}`,
    { waitUntil: "load", timeout: 45_000 },
  );
  // Wait for player-profile links to appear (not just for "loading" to vanish)
  await page
    .waitForFunction(
      () =>
        !document.body.innerText.toLowerCase().includes("loading") &&
        document.querySelector('a[href*="player-profile"]') !== null,
      { timeout: 20_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(500);

  const links = await page.locator('a[href*="player-profile"]').evaluateAll((els) =>
    els.map((el) => ({
      href: el.getAttribute("href") ?? "",
      text: (el.textContent ?? "").toLowerCase(),
    })),
  );

  const firstLower = first.toLowerCase();
  const lastLower = last.toLowerCase();
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Check that first and last appear as an adjacent phrase, not as independent
  // substrings scattered across the text. This prevents "zhan" + "yu" from
  // matching "yuxuan zhang" because "zhan yu" is never adjacent in that string.
  // The right-side lookahead (?![a-z]) stops "chen" matching inside "cheng".
  const reFL = new RegExp(`(?<![a-z])${esc(firstLower)}\\s+${esc(lastLower)}(?![a-z])`);
  const reLF = new RegExp(`(?<![a-z])${esc(lastLower)},?\\s+${esc(firstLower)}(?![a-z])`);

  return links
    .filter((l) => reFL.test(l.text) || reLF.test(l.text))
    .map((l) => l.href);
}

async function readLeagueRating(
  page: Page,
  profileUrl: string,
): Promise<{ leagueRating: number | null; tournamentRating: number | null }> {
  const overviewUrl = profileUrl.replace(/\/profile-[^/]+$/, "/profile-overview");
  await page.goto(
    `https://justgousatt2-dpedf8b3ekgef0fh.centralus-01.azurewebsites.net${overviewUrl}`,
    { waitUntil: "load", timeout: 45_000 },
  );
  // Wait until rating labels appear in the page text
  await page
    .waitForFunction(
      () => {
        const text = document.body.innerText;
        if (text.toLowerCase().includes("loading")) return false;
        return text.includes("League Rating") || text.includes("Tournament Rating");
      },
      { timeout: 20_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(500);

  const text = await page.locator("body").innerText();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let leagueRating: number | null = null;
  let tournamentRating: number | null = null;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "League Rating" && /^\d+$/.test(lines[i - 1])) {
      leagueRating = Number(lines[i - 1]);
    }
    if (lines[i] === "Tournament Rating" && /^\d+$/.test(lines[i - 1])) {
      tournamentRating = Number(lines[i - 1]);
    }
  }

  return { leagueRating, tournamentRating };
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  const body = await request.json() as {
    url?: string;
    knownRatings?: Record<string, { leagueRating: number | null; tournamentRating: number | null }>;
  };
  if (!body.url) {
    return new Response(JSON.stringify({ error: "url is required" }), { status: 400 });
  }
  const knownRatings = body.knownRatings ?? {};

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: "status", message: "Fetching OmniPong page..." });
        const { title, players, ratingCap } = await parseOmniPong(body.url!);

        if (players.length === 0) {
          send({ type: "error", message: "No players found on that OmniPong page. Check the URL." });
          return;
        }

        const newPlayers = players.filter((p) => !(p.name in knownRatings));
        send({ type: "start", title, total: players.length });

        const results: PlayerResult[] = [];

        // Emit cached players immediately as progress events
        for (const player of players) {
          if (player.name in knownRatings) {
            const cached = knownRatings[player.name];
            const result: PlayerResult = { ...player, ...cached };
            results.push(result);
            send({ type: "progress", player: result, done: results.length, total: players.length });
          }
        }

        if (newPlayers.length === 0) {
          results.sort((a, b) => {
            if (a.leagueRating === null && b.leagueRating === null) return 0;
            if (a.leagueRating === null) return 1;
            if (b.leagueRating === null) return -1;
            return b.leagueRating - a.leagueRating;
          });
          send({ type: "done", results });
          return;
        }

        const { chromium } = await import("playwright");
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        try {
          for (const player of newPlayers) {
            const profileUrls = await findProfileUrls(page, player.first, player.last);
            let leagueRating: number | null = null;
            let tournamentRating: number | null = null;
            if (profileUrls.length === 1) {
              ({ leagueRating, tournamentRating } = await readLeagueRating(page, profileUrls[0]));
            } else if (profileUrls.length > 1) {
              // Multiple USATT profiles share this name. Disambiguate, in order:
              //   1. Closest league rating to the OmniPong seed rating (if seed > 0).
              //   2. Highest league rating that's still ≤ the tournament's rating cap
              //      (e.g. "U-1300" rules out a Kevin Chen with a 1672 rating).
              const candidates: Array<{ leagueRating: number | null; tournamentRating: number | null }> = [];
              for (const url of profileUrls) {
                candidates.push(await readLeagueRating(page, url));
              }

              if (player.seedRating !== null && player.seedRating > 0) {
                let bestDiff = Infinity;
                for (const c of candidates) {
                  if (c.leagueRating === null) continue;
                  const diff = Math.abs(c.leagueRating - player.seedRating);
                  if (diff < bestDiff) {
                    bestDiff = diff;
                    leagueRating = c.leagueRating;
                    tournamentRating = c.tournamentRating;
                  }
                }
              } else if (ratingCap !== null) {
                // For zero-seed (unrated) players in a capped league, prefer the
                // lowest-rated match under the cap — same-name strangers with high
                // ratings are likelier to be the wrong person.
                let bestUnderCap = Infinity;
                for (const c of candidates) {
                  if (c.leagueRating === null || c.leagueRating > ratingCap) continue;
                  if (c.leagueRating < bestUnderCap) {
                    bestUnderCap = c.leagueRating;
                    leagueRating = c.leagueRating;
                    tournamentRating = c.tournamentRating;
                  }
                }
              }
            }

            // Sanity check: when a player has no seed rating from OmniPong (i.e. they're
            // new — like Zhan Yu, Kevin Chen in this U-1300 league), the loose name
            // matcher can latch onto a much higher-rated stranger. Reject any match
            // whose league rating is well above the tournament's cap.
            if (
              (player.seedRating === null || player.seedRating === 0) &&
              ratingCap !== null &&
              leagueRating !== null &&
              leagueRating > ratingCap
            ) {
              leagueRating = null;
              tournamentRating = null;
            }
            const result: PlayerResult = { ...player, leagueRating, tournamentRating };
            results.push(result);
            send({ type: "progress", player: result, done: results.length, total: players.length });
          }
        } finally {
          await browser.close();
        }

        results.sort((a, b) => {
          if (a.leagueRating === null && b.leagueRating === null) return 0;
          if (a.leagueRating === null) return 1;
          if (b.leagueRating === null) return -1;
          return b.leagueRating - a.leagueRating;
        });

        send({ type: "done", results });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
