/**
 * OmniPong League Joiner — uses Playwright to automate league entry on omnipong.com.
 * Yields status messages as an async generator for SSE streaming.
 *
 * Page structure (discovered via inspection):
 * - Login: omnipong.com -> click "HERE" link -> fill text/password inputs -> click submit
 * - Leagues: /t-tourney.asp?e=1 -> table rows with league name, date, and action buttons
 * - Action buttons are <input type="submit"> with value "Info", "Enter", "Results", "Players"
 *   - "Info" = not yet open for entry
 *   - "Enter" = open, onclick navigates to Members.asp?ae=...&h=...
 * - After clicking Enter: "I Accept" button, then another "Enter" button to confirm
 */

import type { Page, Locator } from "playwright";

function getPTNow(): Date {
  const ptString = new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });
  return new Date(ptString);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function sleepUntil(targetUtc: number): Promise<void> {
  const ms = targetUtc - Date.now();
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert a PT time on a given date to a UTC timestamp.
 * @param dateStr - date in MM/DD/YY format
 */
function ptTimeToUtc(
  dateStr: string,
  hours: number,
  minutes: number,
  seconds: number,
): number {
  const [mm, dd, yy] = dateStr.split("/").map(Number);
  const year = 2000 + yy;
  const naive = new Date(year, mm - 1, dd, hours, minutes, seconds);
  const utcStr = naive.toLocaleString("en-US", { timeZone: "UTC" });
  const ptStr = naive.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });
  const offsetMs = new Date(utcStr).getTime() - new Date(ptStr).getTime();
  return naive.getTime() + offsetMs;
}

const LEAGUES_URL = "https://www.omnipong.com/t-tourney.asp?e=1";

/**
 * Find the action button (Enter/Info/Results) for the target league.
 *
 * The page has deeply nested tables, so matching by <tr> text is unreliable —
 * a parent <tr> can contain the text of many leagues. Instead, we find ALL
 * action buttons on the page and check each one's closest <tr> for a match.
 */
async function findLeagueButton(
  page: Page,
  leagueName: string,
  leagueDate: string,
): Promise<{
  type: "Enter" | "Info" | "Results" | "NotFound";
  onclickUrl: string | null;
}> {
  // Search all submit buttons for one whose immediate row matches
  const result = await page.evaluate(
    ({ name, date }) => {
      const buttons = document.querySelectorAll<HTMLInputElement>(
        'input[type="submit"]',
      );
      for (const btn of buttons) {
        const val = btn.value;
        if (val !== "Enter" && val !== "Info" && val !== "Results") continue;

        // Walk up to the closest <tr>
        const tr = btn.closest("tr");
        if (!tr) continue;

        // Check that THIS specific row (not a parent) has the league name and date
        // by looking at the direct text content of cells in this row
        const cells = tr.querySelectorAll("td");
        let rowText = "";
        cells.forEach((cell) => {
          rowText += cell.textContent + "\t";
        });

        if (rowText.includes(name) && rowText.includes(date)) {
          return {
            type: val as "Enter" | "Info" | "Results",
            onclickUrl: btn.getAttribute("onclick") || null,
          };
        }
      }
      return { type: "NotFound" as const, onclickUrl: null };
    },
    { name: leagueName, date: leagueDate },
  );

  // Parse the onclick URL if present
  const urlMatch = result.onclickUrl?.match(/open_window\('([^']+)'/);
  return {
    type: result.type,
    onclickUrl: urlMatch
      ? `https://www.omnipong.com/${urlMatch[1]}`
      : null,
  };
}

export async function* joinLeague(
  leagueName: string,
  leagueDate: string,
): AsyncGenerator<string> {
  const user = process.env.OMNIPONG_USER;
  const pass = process.env.OMNIPONG_PASS;

  if (!user || !pass) {
    yield "Error: OMNIPONG_USER and OMNIPONG_PASS must be set in .env";
    return;
  }

  if (!leagueName.trim()) {
    yield "Error: League name is required.";
    return;
  }

  if (!/^\d{2}\/\d{2}\/\d{2}$/.test(leagueDate)) {
    yield "Error: Date must be in MM/DD/YY format.";
    return;
  }

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15_000);

    // ── Step 1: Sign in ──────────────────────────────────────────────────
    yield `Signing in as ${user}...`;
    await page.goto("https://www.omnipong.com", {
      waitUntil: "networkidle",
      timeout: 30_000,
    });

    // Click the "HERE" link to go to sign-in page
    await page.locator('a:has-text("HERE")').first().click();
    await page.waitForLoadState("networkidle");

    // Fill login form — the page has simple text + password inputs
    await page.fill('input[type="text"]', user);
    await page.fill('input[type="password"]', pass);
    await page.locator('input[type="submit"]').first().click();
    await page.waitForLoadState("networkidle");
    yield "Signed in successfully.";

    // ── Step 2: Navigate to Leagues page ─────────────────────────────────
    yield "Navigating to Leagues page...";
    await page.goto(LEAGUES_URL, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    yield "Leagues page loaded.";

    // ── Step 3: Find the target league ─────────────────────────────────
    yield `Searching for: "${leagueName}" on ${leagueDate}...`;

    let btn = await findLeagueButton(page, leagueName, leagueDate);
    if (btn.type === "NotFound") {
      yield `Error: League "${leagueName}" on ${leagueDate} not found.`;
      yield "Check the league name and date for typos.";
      return;
    }
    yield `Found league. Button: "${btn.type}".`;

    // ── Step 4: Check button state & poll ────────────────────────────────
    if (btn.type === "Results") {
      yield "Error: This league already has results — it has already been played.";
      return;
    }

    if (btn.type === "Enter") {
      yield "League was already open. Joining...";
    } else if (btn.type === "Info") {
      const target1159Utc = ptTimeToUtc(leagueDate, 11, 59, 1);
      const target1200Utc = ptTimeToUtc(leagueDate, 12, 0, 0);
      const target1201Utc = ptTimeToUtc(leagueDate, 12, 1, 0);

      if (Date.now() < target1159Utc) {
        yield `${formatTime(getPTNow())} — Waiting until 11:59:01 AM PT for the league to open...`;
        await sleepUntil(target1159Utc);
      }

      yield `${formatTime(getPTNow())} — Reloading page...`;
      await page.goto(LEAGUES_URL, { waitUntil: "networkidle", timeout: 30_000 });
      btn = await findLeagueButton(page, leagueName, leagueDate);

      while (btn.type !== "Enter" && Date.now() < target1200Utc) {
        const waitMs = Math.min(15_000, target1200Utc - Date.now());
        yield `${formatTime(getPTNow())} — Button still shows "Info". Polling in ${Math.round(waitMs / 1000)}s...`;
        await sleep(waitMs);
        await page.goto(LEAGUES_URL, { waitUntil: "networkidle", timeout: 30_000 });
        btn = await findLeagueButton(page, leagueName, leagueDate);
      }

      if (btn.type !== "Enter") {
        yield `${formatTime(getPTNow())} — 12:00 PM reached. High-frequency polling (every 1s)...`;
      }
      while (btn.type !== "Enter" && Date.now() < target1201Utc) {
        await sleep(1_000);
        await page.goto(LEAGUES_URL, { waitUntil: "networkidle", timeout: 30_000 });
        btn = await findLeagueButton(page, leagueName, leagueDate);
        if (btn.type === "Enter") {
          yield `${formatTime(getPTNow())} — Entry is now open!`;
        }
      }

      if (btn.type !== "Enter") {
        yield `${formatTime(getPTNow())} — Timed out at 12:01 PM PT. League entry never opened (may be full).`;
        return;
      }
    } else {
      yield `Error: Unexpected button state "${btn.type}" in the league row.`;
      return;
    }

    // ── Step 5: Navigate to entry page ──────────────────────────────────
    if (!btn.onclickUrl) {
      yield `Error: Could not extract entry URL from the button.`;
      return;
    }
    yield `${formatTime(getPTNow())} — Navigating to entry page...`;
    await page.goto(btn.onclickUrl, { waitUntil: "networkidle", timeout: 30_000 });

    // ── Step 6: Click "I Accept" ─────────────────────────────────────────
    yield "Accepting terms...";
    const acceptBtn = page.locator(
      'input[type="submit"][value="I Accept"], a:has-text("I Accept"), button:has-text("I Accept")',
    ).first();
    // Try extracting onclick URL first; fall back to direct click
    const acceptOnclick = await acceptBtn.getAttribute("onclick").catch(() => null);
    const acceptUrlMatch = acceptOnclick?.match(/open_window\('([^']+)'/);
    if (acceptUrlMatch) {
      await page.goto(`https://www.omnipong.com/${acceptUrlMatch[1]}`, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
    } else {
      await acceptBtn.click({ timeout: 10_000 });
      await page.waitForLoadState("networkidle");
    }

    // ── Step 7: Click final "Enter" ──────────────────────────────────────
    yield "Confirming entry...";
    const finalEnterBtn = page.locator(
      'input[type="submit"][value="Enter"], a:has-text("Enter"), button:has-text("Enter")',
    ).first();
    const finalOnclick = await finalEnterBtn.getAttribute("onclick").catch(() => null);
    const finalUrlMatch = finalOnclick?.match(/open_window\('([^']+)'/);
    if (finalUrlMatch) {
      await page.goto(`https://www.omnipong.com/${finalUrlMatch[1]}`, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
    } else {
      await finalEnterBtn.click({ timeout: 10_000 });
      await page.waitForLoadState("networkidle");
    }

    yield "Successfully joined the league!";
  } catch (err) {
    yield `Error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    await browser.close();
  }
}
