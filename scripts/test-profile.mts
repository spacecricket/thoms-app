import { chromium } from "playwright";

const WEBLET_BASE =
  "https://justgousatt2-dpedf8b3ekgef0fh.centralus-01.azurewebsites.net" +
  "/weblets/load/Result/b11c2cb7-130d-4274-bf68-ca7b5ffb19ac" +
  "/FA4D9651-1327-40DF-BFB9-7A6768AD4931";

const THOM_ID = "7E78D830-53B2-42E8-BB70-6C2A0CE298C2";

// Also test: get all hrefs from the ranking search to understand how to navigate to profiles
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// First check what links are on the ranking search results
console.log("=== RANKING SEARCH LINKS ===");
await page.goto(`${WEBLET_BASE}/ranking?search=Sonavane`, { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(2_000);
const links = await page.locator("a").evaluateAll((els) =>
  els.map((el) => ({ href: el.getAttribute("href"), text: el.textContent?.trim() })).filter((l) => l.href)
);
console.log(JSON.stringify(links.slice(0, 20), null, 2));

// Now check the profile overview page
console.log("\n=== PROFILE OVERVIEW ===");
await page.goto(`${WEBLET_BASE}/player-profile/${THOM_ID}/profile-overview`, { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(2_000);
const text = await page.locator("body").innerText();
console.log(text.slice(0, 2000));

await browser.close();
