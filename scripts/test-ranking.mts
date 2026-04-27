import { chromium } from "playwright";

const WEBLET_BASE =
  "https://justgousatt2-dpedf8b3ekgef0fh.centralus-01.azurewebsites.net" +
  "/weblets/load/Result/b11c2cb7-130d-4274-bf68-ca7b5ffb19ac" +
  "/FA4D9651-1327-40DF-BFB9-7A6768AD4931";

const url = `${WEBLET_BASE}/ranking?search=Sonavane`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(3_000);
const text = await page.locator("body").innerText();
console.log(text.slice(0, 2000));
await browser.close();
