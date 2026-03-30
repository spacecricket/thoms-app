# USATT JustGo Scraping Reference

This document captures everything learned about scraping Thom Sonavane's league data
from `ratings.usatt.org`. The site is a JavaScript SPA running inside an iframe, which
makes it impossible to scrape with simple HTTP requests — Playwright (headless browser)
is required.

## Architecture

- `ratings.usatt.org` serves a thin HTML page with a single `<iframe>`.
- The iframe loads a JustGo weblet from Azure:
  ```
  https://justgousatt2-dpedf8b3ekgef0fh.centralus-01.azurewebsites.net
    /weblets/Load/Result/b11c2cb7-130d-4274-bf68-ca7b5ffb19ac/
  ```
- The JustGo app is a React SPA that fetches all data via SignalR (WebSockets),
  not REST — so intercepting network requests is not useful for data extraction.
- All data must be extracted from the **rendered DOM text** after the JS finishes.

## Key URLs (Weblet Base)

All paths below are relative to:
```
https://justgousatt2-dpedf8b3ekgef0fh.centralus-01.azurewebsites.net
  /weblets/load/Result/b11c2cb7-130d-4274-bf68-ca7b5ffb19ac
```

### Organization IDs
- **Tournament org**: `AA8491C6-C0EF-408E-9DE4-D141BCB42637`
- **League org**: `FA4D9651-1327-40DF-BFB9-7A6768AD4931`

### Player ID (Thom Sonavane)
- **USATT#**: 287622
- **JustGo GUID**: `7E78D830-53B2-42E8-BB70-6C2A0CE298C2`

### Page URLs

| Page | URL |
|------|-----|
| League player list | `/{LEAGUE_ORG}/ranking` |
| Player search | `/{LEAGUE_ORG}/ranking?search=Thom+Sonavane` |
| Player profile overview | `/{LEAGUE_ORG}/player-profile/{PLAYER_ID}/profile-overview` |
| Player league events | `/{LEAGUE_ORG}/player-profile/{PLAYER_ID}/profile-matches?tab=league` |
| Single event matches | `/{LEAGUE_ORG}/player-profile/{PLAYER_ID}/profile-matche-history/{EVENT_ID}?tab=league` |

Note: `profile-matche-history` is a typo in the JustGo app (missing 's') — it's the real URL.

## Events List Page

**URL**: `.../profile-matches?tab=league`

### Behavior
- Shows 10 events initially, loads more on scroll (infinite scroll).
- To load all events, repeatedly scroll to the bottom and wait ~1.2s between scrolls.
- Check count with: `document.querySelectorAll('a[href*="profile-matche-history"]').length`
- Thom currently has **50 events** (as of March 2026).

### Rendered Text Format
Each event card renders as concatenated text with NO delimiters:
```
29 Mar 2026Spttc Junior League 3/28/26Club Leagues & EventsRating80181312 4 played4 won0 lost
```

Breaking this down:
| Field | Example | Notes |
|-------|---------|-------|
| Date | `29 Mar 2026` | Format: `DD Mon YYYY` |
| Event name | `Spttc Junior League 3/28/26` | |
| Category | `Club Leagues & Events` | Sometimes absent |
| Rating marker | `Rating` | Literal string |
| Rating before | `801` | 3-4 digits, or `Unrated` for first event |
| Rating after | `813` | 3-4 digits |
| Rating change | `12` | Can be negative |
| Played | `4 played` | |
| Won | `4 won` | |
| Lost | `0 lost` | |

### Event Link Extraction
Each event is an `<a>` tag with href containing `/profile-matche-history/{EVENT_ID}`.
Extract event IDs from the href attribute using:
```js
a.getAttribute('href').match(/profile-matche-history\/(\d+)/)?.[1]
```

## Single Event Match History Page

**URL**: `.../profile-matche-history/{EVENT_ID}?tab=league`

### Rendered Text Format
The full page text looks like:
```
Spttc Junior League 3/28/26 29 Mar 2026RefreshThom Sonavane4 Matches Found
TSWinnerUSATT# 287622Thom Sonavane80181312Match Result3-1ASUSATT# 1185296Ashwath Siddharth73471618
TSWinnerUSATT# 287622Thom Sonavane80181312Match Result3-0YLUSATT# 285606Yiding Lu71468727
QHWinnerUSATT# 286853Qi He636790154Match Result'3-1'TSUSATT# 287622Thom Sonavane71276654
You've reached the end of the player Matches
```

### Match Block Structure

Each match is delimited by `[A-Z]{2}Winner` markers. Split on: `(?=[A-Z]{2}Winner)`

| Pattern | Meaning |
|---------|---------|
| `TSWinner` | **Thom won** (TS = Thom Sonavane initials) |
| `XXWinner` | **Opponent XX won** (e.g. `QHWinner` = Qi He won) |

### Within Each Match Block

**When Thom won** (starts with `TSWinner`):
```
TSWinnerUSATT# 287622Thom Sonavane{rb}{ra}{change}Match Result{score}{OppInitials}USATT# {oppId}{OppName}{oppRb}{oppRa}{oppChange}
```

**When opponent won** (starts with `XXWinner`):
```
{XX}WinnerUSATT# {oppId}{OppName}{oppRb}{oppRa}{oppChange}Match Result'{score}'{TS}USATT# 287622Thom Sonavane{rb}{ra}{change}
```

### Score Extraction
- Score appears after `Match Result` as either `3-1` or `'3-1'` (with quotes).
- Regex: `Match Result'?(\d+)-(\d+)'?`

### Opponent Name Extraction
1. Split the block on `USATT#\s*(\d+)` to get `[prefix, id1, text1, id2, text2, ...]`
2. Skip the pair where id = `287622` (Thom)
3. The opponent's name is the leading alphabetic text in their text segment
4. Regex for name: `^([A-Za-z ,.'\\-]+)` (stops at first digit run)

### Gotchas
- Some opponent ratings show `Unrated` instead of a number (e.g. `Eric EdgertonUnrated697697`)
- Score quotes are inconsistent — some events use `'3-0'`, others use `3-0`
- The winner block order flips when the opponent wins (opponent info comes FIRST)
- `networkidle` is the best Playwright wait strategy — the SPA uses SignalR which
  eventually settles, but an extra 1s wait after networkidle improves reliability

## Playwright Strategy

```typescript
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
await page.waitForTimeout(1_000) // extra settle time
const text = await page.locator('body').innerText()
```

For the events list page, infinite scroll handling:
```typescript
let prevCount = 0
for (let i = 0; i < 10; i++) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1_200)
  const count = await page.locator('a[href*="profile-matche-history"]').count()
  if (count === prevCount && i > 2) break
  prevCount = count
}
```

## Data Volumes (as of March 2026)

- **50** league events
- **253** individual matches
- **97** unique opponents
- Rating range: Unrated → 717 → 429 (low) → 813 (current)
