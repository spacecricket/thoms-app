/**
 * Looks up USATT league ratings for a list of players and sorts them.
 * Run with: node_modules/.bin/tsx scripts/league-ratings.mts
 *
 * Strategy:
 *   1. Search the USATT league ranking by last name to get the player's profile GUID.
 *   2. Navigate to their profile-overview page.
 *   3. Extract the explicit "League Rating" badge value (not tournament rating).
 */
import { chromium, type Page } from "playwright";

const WEBLET_BASE =
  "https://justgousatt2-dpedf8b3ekgef0fh.centralus-01.azurewebsites.net" +
  "/weblets/load/Result/b11c2cb7-130d-4274-bf68-ca7b5ffb19ac" +
  "/FA4D9651-1327-40DF-BFB9-7A6768AD4931";

const PLAYERS: { first: string; last: string }[] = [
  { first: "Eli",          last: "Zeitlin"         },
  { first: "Tejas",        last: "Yella"            },
  { first: "Vineeth",      last: "Chelur"           },
  { first: "Dahnah",       last: "Sherman"          },
  { first: "Blake",        last: "Allison"          },
  { first: "Kamyab",       last: "Karimi"           },
  { first: "Brian",        last: "He"               },
  { first: "Teng",         last: "Li"               },
  { first: "Noah",         last: "Lewis"            },
  { first: "Ashwath",      last: "Siddharth"        },
  { first: "Denis",        last: "Mazalo"           },
  { first: "Anthony",      last: "Chen"             },
  { first: "Thom",         last: "Sonavane"         },
  { first: "Daniel",       last: "Lazar"            },
  { first: "Hyatt",        last: "Hasegawa Bailey"  },
  { first: "Priya Ranjan", last: "Panda"            },
  { first: "Kavin",        last: "Sudhakar"         },
  { first: "Jianhua",      last: "Li"               },
  { first: "Daniel",       last: "Leal"             },
  { first: "Tanuj",        last: "Nayak"            },
];

async function waitForRender(page: Page) {
  await page
    .waitForFunction(
      () => !document.body.innerText.toLowerCase().includes("loading"),
      { timeout: 20_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(1_500);
}

/** Find the player's profile GUID from the ranking search page. */
async function findProfileUrl(
  page: Page,
  first: string,
  last: string,
): Promise<string | null> {
  // Try full name first for precision; fall back to last name if no results
  const fullName = `${first} ${last}`;
  const searchTerm = fullName;
  await page.goto(
    `${WEBLET_BASE}/ranking?search=${encodeURIComponent(searchTerm)}`,
    { waitUntil: "networkidle", timeout: 30_000 },
  );
  await waitForRender(page);

  // Profile links look like: /…/player-profile/{GUID}/profile-overview
  // The link text contains "Last, First" — match against both parts.
  const links = await page.locator('a[href*="player-profile"]').evaluateAll(
    (els) =>
      els.map((el) => ({
        href: el.getAttribute("href") ?? "",
        text: (el.textContent ?? "").toLowerCase(),
      })),
  );

  const firstLower = first.toLowerCase();
  const lastLower = last.toLowerCase();

  // Find a link whose text includes both first and last name parts
  const match = links.find(
    (l) =>
      lastLower.split(" ").every((part) => l.text.includes(part)) &&
      firstLower.split(" ").every((part) => l.text.includes(part)),
  );

  if (match) return match.href;

  // Fallback: match just last name (for uncommon surnames)
  const fallback = links.find((l) =>
    lastLower.split(" ").every((part) => l.text.includes(part)),
  );
  return fallback?.href ?? null;
}

/** Read league rating from the player's profile-overview page. */
async function readLeagueRating(
  page: Page,
  profileUrl: string,
): Promise<{ leagueRating: number | null; tournamentRating: number | null }> {
  const overviewUrl = profileUrl.replace(/\/profile-[^/]+$/, "/profile-overview");
  await page.goto(`https://justgousatt2-dpedf8b3ekgef0fh.centralus-01.azurewebsites.net${overviewUrl}`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  await waitForRender(page);

  const text = await page.locator("body").innerText();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Format: "NNN\nLeague Rating" and "NNN\nTournament Rating"
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

async function main() {
  console.log(`Looking up USATT league ratings for ${PLAYERS.length} players...\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results: Array<{
    name: string;
    leagueRating: number | null;
    tournamentRating: number | null;
  }> = [];

  try {
    for (const { first, last } of PLAYERS) {
      const name = `${first} ${last}`;
      process.stdout.write(`  ${name.padEnd(28)}`);

      const profileUrl = await findProfileUrl(page, first, last);
      if (!profileUrl) {
        console.log("not found on USATT");
        results.push({ name, leagueRating: null, tournamentRating: null });
        continue;
      }

      const { leagueRating, tournamentRating } = await readLeagueRating(page, profileUrl);
      console.log(
        `league=${leagueRating ?? "N/A"}  tournament=${tournamentRating ?? "N/A"}`,
      );
      results.push({ name, leagueRating, tournamentRating });
    }
  } finally {
    await browser.close();
  }

  // Sort: rated players first (descending), unrated at bottom
  results.sort((a, b) => {
    if (a.leagueRating === null && b.leagueRating === null) return 0;
    if (a.leagueRating === null) return 1;
    if (b.leagueRating === null) return -1;
    return b.leagueRating - a.leagueRating;
  });

  console.log("\n=== Spttc Sunday League U-1300 — Sorted by USATT League Rating ===\n");
  console.log("Rank  Player                      League Rating  Tournament Rating");
  console.log("----  --------------------------  -------------  -----------------");

  let rank = 1;
  for (const r of results) {
    console.log(
      `${String(rank).padStart(4)}  ${r.name.padEnd(26)}  ${
        (r.leagueRating?.toString() ?? "N/A").padStart(13)
      }  ${r.tournamentRating?.toString() ?? "N/A"}`,
    );
    rank++;
  }
}

main().catch(console.error);
