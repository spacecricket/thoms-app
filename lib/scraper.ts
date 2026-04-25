/**
 * JustGo Scraper — uses Playwright to render the SPA and extract data.
 * See SCRAPING.md for full documentation of the page formats.
 */
import type { ScrapedEvent, ScrapedMatch, ScrapedEventDetail } from "./types";

const WEBLET_BASE =
  "https://justgousatt2-dpedf8b3ekgef0fh.centralus-01.azurewebsites.net" +
  "/weblets/load/Result/b11c2cb7-130d-4274-bf68-ca7b5ffb19ac" +
  "/FA4D9651-1327-40DF-BFB9-7A6768AD4931";

const PLAYER_ID = "7E78D830-53B2-42E8-BB70-6C2A0CE298C2";
const THOM_USATT = "287622";

const EVENTS_URL = `${WEBLET_BASE}/player-profile/${PLAYER_ID}/profile-matches?tab=league`;

function matchHistoryUrl(eventId: string) {
  return `${WEBLET_BASE}/player-profile/${PLAYER_ID}/profile-matche-history/${eventId}?tab=league`;
}

// ── Playwright helpers ────────────────────────────────────────────────────────

export async function fetchRenderedText(
  url: string,
  maxRetries = 3,
): Promise<string> {
  const { chromium } = await import("playwright");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      // Wait for SPA to finish rendering:
      // The page goes through: "loading..." → "0 Matches Found" → actual data
      await page.waitForFunction(
        () => {
          const text = document.body.innerText.toLowerCase();
          if (text.includes("loading")) return false;
          if (text.includes("0 matches found")) return false;
          if (text.includes("0 competitions found")) return false;
          return true;
        },
        { timeout: 30_000 },
      ).catch(() => {});
      await page.waitForTimeout(1_000);
      const text = await page.locator("body").innerText();

      // If still stuck on empty/loading state, retry
      const lower = text.toLowerCase();
      if (
        attempt < maxRetries &&
        (lower.includes("0 matches found") || lower.includes("loading"))
      ) {
        console.log(
          `fetchRenderedText attempt ${attempt}/${maxRetries} got stale page, retrying...`,
        );
        continue;
      }
      return text;
    } finally {
      await browser.close();
    }
  }

  // Should not reach here, but TypeScript needs it
  throw new Error("fetchRenderedText: all retries exhausted");
}

export async function fetchEventsListRaw(): Promise<{
  text: string;
  links: { id: string }[];
}> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(EVENTS_URL, { waitUntil: "networkidle", timeout: 30_000 });
    // Wait for SPA to finish rendering
    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return !text.includes("loading") && !text.includes("0 competitions found");
      },
      { timeout: 30_000 },
    ).catch(() => {});

    // Scroll to load all events (infinite scroll, ~10 per batch)
    let prevCount = 0;
    for (let attempt = 0; attempt < 10; attempt++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1_200);
      const count = await page
        .locator('a[href*="profile-matche-history"]')
        .count();
      if (count === prevCount && attempt > 2) break;
      prevCount = count;
    }

    const links = await page
      .locator('a[href*="profile-matche-history"]')
      .evaluateAll((els) =>
        els
          .map((el) => ({
            id:
              (el.getAttribute("href") ?? "").match(
                /profile-matche-history\/(\d+)/,
              )?.[1] ?? "",
          }))
          .filter((l) => l.id !== ""),
      );

    const text = await page.locator("body").innerText();
    return { text, links };
  } finally {
    await browser.close();
  }
}

// ── Pure parsers ──────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function parseDate(raw: string): string {
  const m = raw.match(/(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{4})/);
  if (!m) return "1970-01-01";
  const [, d, mon, y] = m;
  return `${y}-${MONTH_MAP[mon] ?? "01"}-${d.padStart(2, "0")}`;
}

export function parseEventsListText(
  rawText: string,
  links: { id: string }[],
): Omit<ScrapedEvent, "alreadyImported" | "importedAt">[] {
  // The page text concatenates all event cards without clear delimiters.
  // Each event starts with a date like "29 Mar 2026".
  // We split on date boundaries and match them to the links array (same order).
  const datePattern =
    /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/g;
  const dateMatches = [...rawText.matchAll(datePattern)];

  // Find the starting position of event data (after header like "50 competitions found")
  const startMarker = rawText.indexOf("competitions found");
  const startPos = startMarker !== -1 ? startMarker : 0;

  // Filter dates that appear after the start marker
  const eventDates = dateMatches.filter((m) => (m.index ?? 0) > startPos);

  const results: Omit<ScrapedEvent, "alreadyImported" | "importedAt">[] = [];

  for (let i = 0; i < links.length && i < eventDates.length; i++) {
    const { id } = links[i];
    const dateMatch = eventDates[i];
    const dateStr = dateMatch[0];
    const blockStart = dateMatch.index ?? 0;
    const blockEnd =
      i + 1 < eventDates.length
        ? (eventDates[i + 1].index ?? rawText.length)
        : rawText.length;
    const block = rawText.slice(blockStart, blockEnd);

    const date = parseDate(dateStr);

    // Extract event name — text between the date and "Club Leagues" or "Rating"
    const afterDate = block.slice(dateStr.length);
    const nameEnd = afterDate.search(/(?:Club Leagues|Rating)/);
    const name =
      nameEnd > 0 ? afterDate.slice(0, nameEnd).trim() : "Unknown Event";

    // Played/Won/Lost: "N played...N won...N lost"
    const playedMatch = block.match(
      /(\d+)\s*played.*?(\d+)\s*won.*?(\d+)\s*lost/s,
    );
    const played = playedMatch ? Number(playedMatch[1]) : 0;
    const won = playedMatch ? Number(playedMatch[2]) : 0;
    const lost = playedMatch ? Number(playedMatch[3]) : 0;

    const blockParts = block.split(/\n+/);

    let ratingIndex = 0
    for (; ratingIndex < blockParts.length; ratingIndex++) {
      if (blockParts[ratingIndex] === 'Rating') {
        break;
      }
    }

    const ratingBeforeText = blockParts[ratingIndex + 1];
    const ratingBefore = ratingBeforeText.toLowerCase() === 'unrated' ? 0 : Number(ratingBeforeText);
    const ratingAfter = Number(blockParts[ratingIndex + 2]);

    results.push({
      id,
      name,
      date,
      ratingBefore,
      ratingAfter,
      won,
      lost,
      played,
    });
  }

  return results;
}

/**
 * Parse a player section from a match block.
 * Format after USATT# line:
 *   USATT# XXXXXX
 *   Player Name
 *   Rating Before (or "Unrated")
 *   Rating After
 *   Rating Change
 */
function parsePlayerSection(lines: string[]): {
  usattId: string;
  name: string;
  ratingBefore: number;
  ratingAfter: number;
} | null {
  // Find the USATT# line
  const usattIdx = lines.findIndex((l) => /^USATT#\s*\d+/.test(l));
  if (usattIdx === -1) return null;

  const usattMatch = lines[usattIdx].match(/USATT#\s*(\d+)/);
  if (!usattMatch) return null;

  const name = lines[usattIdx + 1]?.trim();
  if (!name) return null;

  let ratingBeforeStr = lines[usattIdx + 2]?.trim() ?? "0";
  if (ratingBeforeStr.toLowerCase() === "unrated") ratingBeforeStr = "0";
  const ratingBefore = /^\d+$/.test(ratingBeforeStr) ? Number(ratingBeforeStr) : 0;

  // Page formats observed:
  //   Old: ratingBefore, ratingAfter (large number e.g. 813), ratingChange (e.g. 12)
  //   New: ratingBefore, ratingChange (small number e.g. 2) — no explicit ratingAfter line
  // Distinguish by magnitude: changes are typically < 50; after-ratings are ≥ 100.
  const next = lines[usattIdx + 3]?.trim() ?? "";
  const nextNum = /^-?\d+$/.test(next) ? Number(next) : null;
  let ratingAfter: number;
  if (nextNum === null) {
    ratingAfter = ratingBefore; // no second number — single-rating format
  } else if (Math.abs(nextNum) < 100) {
    ratingAfter = ratingBefore + nextNum; // it's a change delta
  } else {
    ratingAfter = nextNum; // it's a full rating-after value (old format)
  }

  return {
    usattId: usattMatch[1],
    name,
    ratingBefore,
    ratingAfter,
  };
}

export function parseMatchHistoryText(rawText: string): ScrapedMatch[] {
  const matches: ScrapedMatch[] = [];

  // Find content start — "X Matches Found" (case-insensitive)
  const startIdx = rawText.search(/\d+\s+matches\s+found/i);
  if (startIdx === -1) {
    console.warn("parseMatchHistoryText: 'Matches Found' not found in page text. First 300 chars:", rawText.slice(0, 300));
    return [];
  }
  let content = rawText.slice(startIdx);

  // Trim trailing boilerplate (case-insensitive for apostrophe variants)
  const endIdx = content.search(/you.ve reached/i);
  if (endIdx !== -1) content = content.slice(0, endIdx);

  // Split into match blocks. Two formats observed:
  //   Old: "TSWinner" concatenated on one line  → split on (?=[A-Z]{2}Winner)
  //   New: "TS\nWinner" on separate lines       → split on \n(?=[A-Z]{2}\nWinner)
  // Lookahead keeps the delimiter at the start of each block.
  const blocks = content.split(/\n(?=[A-Z]{2}\nWinner)|(?=[A-Z]{2}Winner)/);

  for (const block of blocks) {
    if (!block.includes("Winner") || !block.includes("Match Result")) continue;

    const lines = block.split(/\n+/).map((l) => l.trim()).filter(Boolean);

    // Score line: contains digits-digits (possibly quoted)
    const scoreMatch = lines.map((l) => l.match(/'?(\d+)-(\d+)'?/)).find(Boolean);
    if (!scoreMatch) continue;

    // Split block at "Match Result": winner section before, loser section after
    const matchResultIdx = lines.findIndex((l) => l.includes("Match Result"));
    if (matchResultIdx === -1) continue;

    const winnerLines = lines.slice(0, matchResultIdx);
    const loserLines = lines.slice(matchResultIdx + 1);

    const winner = parsePlayerSection(winnerLines);
    const loser = parsePlayerSection(loserLines);
    if (!winner || !loser) continue;

    const thomWon = winner.usattId === THOM_USATT;
    const thom = thomWon ? winner : loser;
    const opponent = thomWon ? loser : winner;

    const s1 = Number(scoreMatch[1]);
    const s2 = Number(scoreMatch[2]);
    const thomSets = thomWon ? Math.max(s1, s2) : Math.min(s1, s2);
    const opponentSets = thomWon ? Math.min(s1, s2) : Math.max(s1, s2);

    matches.push({
      opponentUsattId: opponent.usattId,
      opponentName: opponent.name,
      thomSets,
      opponentSets,
      scoreString: `${thomSets}-${opponentSets}`,
      thomWon,
      thomRatingBefore: thom.ratingBefore,
      thomRatingAfter: thom.ratingAfter,
    });
  }

  return matches;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function scrapeEventsList(
  importedIds: Record<string, string>,
): Promise<ScrapedEvent[]> {
  const { text, links } = await fetchEventsListRaw();
  return parseEventsListText(text, links).map((e) => ({
    ...e,
    alreadyImported: e.id in importedIds,
    importedAt: importedIds[e.id] ?? null,
  }));
}

export async function scrapeEventDetail(
  eventId: string,
): Promise<ScrapedEventDetail> {
  const rawText = await fetchRenderedText(matchHistoryUrl(eventId));

  const dateMatch = rawText.match(
    /(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})/,
  );
  const date = dateMatch ? parseDate(dateMatch[1]) : "1970-01-01";

  // Name is the text before the date
  const nameEnd = rawText.indexOf(dateMatch?.[0] ?? "");
  const rawName = nameEnd > 0 ? rawText.slice(0, nameEnd).trim() : "";
  // Strip any leading noise from "You need to enable JavaScript..." etc.
  const name = rawName.replace(/^.*?app\.\s*/, "").trim() || "Unknown Event";

  const matches = parseMatchHistoryText(rawText);
  if (matches.length === 0) {
    throw new Error(
      `No matches found for event ${eventId}. Page text starts with: "${rawText.slice(0, 200)}"`,
    );
  }
  const won = matches.filter((m) => m.thomWon).length;
  const lost = matches.filter((m) => !m.thomWon).length;

  const ratingBefore = matches[0].thomRatingBefore;
  const ratingAfter = matches[matches.length - 1].thomRatingAfter;

  return {
    id: eventId,
    name,
    date,
    ratingBefore,
    ratingAfter,
    won,
    lost,
    played: won + lost,
    alreadyImported: false,
    importedAt: null,
    matches,
  };
}
