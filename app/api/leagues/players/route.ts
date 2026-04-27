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

async function parseOmniPong(url: string): Promise<{ title: string; players: OmniPongPlayer[] }> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`OmniPong fetch failed: ${res.status}`);
  const html = await res.text();

  const titleMatch = html.match(/<h3[^>]*>(.*?)<\/h3>/is);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "Unknown Event";

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

  return { title, players };
}

async function findProfileUrl(page: Page, first: string, last: string): Promise<string | null> {
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

  const exact = links.find(
    (l) =>
      lastLower.split(" ").every((p) => l.text.includes(p)) &&
      firstLower.split(" ").every((p) => l.text.includes(p)),
  );
  if (exact) return exact.href;

  return (
    links.find((l) => lastLower.split(" ").every((p) => l.text.includes(p)))?.href ?? null
  );
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

  const body = await request.json() as { url?: string };
  if (!body.url) {
    return new Response(JSON.stringify({ error: "url is required" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: "status", message: "Fetching OmniPong page..." });
        const { title, players } = await parseOmniPong(body.url!);

        if (players.length === 0) {
          send({ type: "error", message: "No players found on that OmniPong page. Check the URL." });
          return;
        }

        send({ type: "start", title, total: players.length });

        const { chromium } = await import("playwright");
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        const results: PlayerResult[] = [];
        try {
          for (const player of players) {
            const profileUrl = await findProfileUrl(page, player.first, player.last);
            let leagueRating: number | null = null;
            let tournamentRating: number | null = null;
            if (profileUrl) {
              ({ leagueRating, tournamentRating } = await readLeagueRating(page, profileUrl));
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
