# Multi-Player Support

Allow multiple tracked players (not just Thom) to have their own league analysis pages. Data is public — no auth required.

---

## Schema

Replace the current Thom-centric schema with a fully normalized model.

```prisma
model Player {
  usattId      String        @id @map("usatt_id")
  name         String
  tracked      Boolean       @default(false)
  playerEvents PlayerEvent[]
  wonMatches   Match[]       @relation("winner")
  lostMatches  Match[]       @relation("loser")
  @@map("players")
}

model Event {
  id           String        @id
  name         String
  date         String
  playerEvents PlayerEvent[]
  matches      Match[]
  @@map("events")
}

model PlayerEvent {
  playerUsattId String  @map("player_usatt_id")
  eventId       String  @map("event_id")
  ratingBefore  Int     @map("rating_before")
  ratingAfter   Int     @map("rating_after")
  player        Player  @relation(fields: [playerUsattId], references: [usattId])
  event         Event   @relation(fields: [eventId], references: [id])
  @@id([playerUsattId, eventId])
  @@map("player_events")
}

model Match {
  id              Int    @id @default(autoincrement())
  eventId         String @map("event_id")
  event           Event  @relation(fields: [eventId], references: [id])
  winnerUsattId   String @map("winner_usatt_id")
  winner          Player @relation("winner", fields: [winnerUsattId], references: [usattId])
  loserUsattId    String @map("loser_usatt_id")
  loser           Player @relation("loser", fields: [loserUsattId], references: [usattId])
  winnerSets      Int    @map("winner_sets")
  loserSets       Int    @map("loser_sets")
  scoreString     String @map("score_string")
  @@map("matches")
}
```

**Removed:** `Opponent` table, `Match.thomWon`, `Match.thomSets`, `Match.opponentSets`, `Event.ratingBefore`, `Event.ratingAfter`.

---

## Scraper Changes

`scrape(usattId: string)` becomes an explicit parameter instead of hardcoded `THOM_USATT`.

- Any player encountered in a match is upserted into `Player` with `tracked = false`
- `ratingBefore` / `ratingAfter` are written to `PlayerEvent` (keyed by `playerUsattId + eventId`)
- Matches are upserted keyed on `(eventId, winnerUsattId, loserUsattId)` to avoid duplicates when multiple tracked players share events

---

## Analysis Changes

`getAnalysisData(usattId: string)` — all queries filter or join via `PlayerEvent` for the given player.

- **Rating timeline:** `SELECT * FROM player_events WHERE player_usatt_id = ? ORDER BY event.date`
- **H2H:** `SELECT * FROM matches WHERE winner_usatt_id = ? OR loser_usatt_id = ?`, then derive `playerWon`, `playerSets`, `opponentSets`, `opponentUsattId` at the application layer based on which side the player is on
- **Stats:** same aggregation logic, just computed from the derived perspective fields above

---

## Routing

| Route | Purpose |
|---|---|
| `/` | Landing page — lists all `Player WHERE tracked = true` |
| `/[usattId]` | Redirect to `/[usattId]/league` |
| `/[usattId]/league` | League dashboard (currently `/league`) |
| `/[usattId]/admin` | Import page (currently `/league/admin`) |

---

## Landing Page

- Query all `tracked` players, ordered by `name` or `addedAt`
- Each card shows name, current rating, link to their dashboard
- "Current rating" = latest `ratingAfter` from their most recent `PlayerEvent`

---

## UI Copy

In `LeagueDashboard`, replace hardcoded strings:

| Current | New |
|---|---|
| `"Thom's Leagues"` | `${player.name}'s Leagues` |
| `"USATT# 287622"` | `USATT# ${player.usattId}` |

Player record is passed as a prop from the server page component, which receives `usattId` from the route params.

---

## Admin / Import

`/[usattId]/admin` — the import flow calls `scrape(usattId)` instead of always using Thom's ID. The "Import All New" button already knows which player it's acting on from the route.

---

## Migration

1. `pnpm db:push --force-reset` (schema is a breaking change)
2. Re-seed Thom's data with the new scraper (`pnpm seed 287622`)
3. Mark Thom as `tracked = true`
