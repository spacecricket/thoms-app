# thom's app

A personal table tennis stats tracker for one player, built as a vibe-coding hobby project:
ideas go in through conversation, code comes out, and your competence slowly drains away ;).

Live at **[https://thom.so](https://thom.so)**.

## What it does

- **League dashboard** (`/leagues`) — rating progression, win/loss record, summary stats,
  per-opponent head-to-head with expandable match details, and per-event notes.
- **Event import** (`/leagues/import`, admin) — lists Thom's events from USATT's JustGo API and
  imports a selected event's matches into Postgres.
- **Tournament rating predictor** (`/tournament-rating-predictor`, local-only) — recalculates every
  player's USATT rating for an OmniPong tournament: points-exchange chart, pass 1 adjustments,
  initial ratings for unrated players, then the final pass.

## A note on the data

The match history is intentionally hardcoded for Thom. USATT match data belongs to USATT, and I
don't have the rights to build a general-purpose product on top of it. This is a personal project,
not a platform.

## Tech stack

- **Next.js 16** — App Router, server + client components
- **Prisma 7** + **PostgreSQL** on [Neon](https://neon.tech), via `@prisma/adapter-neon` (the Neon
  serverless driver, so the same code runs in Node and on Workers)
- **Tailwind CSS 4**
- **Cloudflare Workers** via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)

## Getting started

```bash
npm install
cp .env.example .env        # then set DATABASE_URL (Neon pooled) and ADMIN_PASSWORD
npm run db:migrate          # apply migrations
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Admin-only API routes expect `Authorization: Bearer $ADMIN_PASSWORD`. The import page prompts for
the password and keeps it in `sessionStorage`.

## Tournament rating predictor (local-only)

The `/tournament-rating-predictor` page and `/api/tournament-rating-predictor` are **not available
in production builds** — they return 404. A single run fetches one OmniPong page per player (~120
requests for a big event), which exceeds Cloudflare Workers' subrequest budget.

```bash
npm run dev                              # then use the page at /tournament-rating-predictor
npm run ratings:omnipong -- 6328         # or the CLI; writes scripts/data/omnipong-<id>-ratings.csv
```

Doubles aren't rated by USATT, so only singles are counted. Unrated players who won or lost every
match against rated opponents need the tournament director's estimated rating, which OmniPong
doesn't publish — those rows are marked as inferred.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | `prisma generate && next build` |
| `npm run start` | Serve a local production build (Node) |
| `npm run preview` | Build and serve in the Workers runtime (Wrangler) |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run upload` | Upload a new Worker version without promoting it |
| `npm run cf-typegen` | Regenerate Cloudflare binding types |
| `npm run lint` | ESLint |
| `npm run db:migrate` / `db:push` | Prisma migrations |
| `npm run ratings:omnipong` | Local tournament rating prediction CLI |

## Deploying

```bash
npx wrangler login
npx wrangler secret put DATABASE_URL     # Neon pooled connection string
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

Then attach the custom domain (`thom.so`) to the Worker in the Cloudflare dashboard.

`npm run preview` runs the production build inside `workerd` and reads `.dev.vars` (copy
`.dev.vars.example`); `next dev` reads `.env` instead.

### Gotchas

- **Keep `runtime = "workerd"`** in the `prisma-client` generator (`prisma/schema.prisma`). Workerd
  cannot compile WebAssembly from bytes at runtime, so the default `nodejs` runtime fails with
  *"Wasm code generation disallowed by embedder"*. The `workerd` runtime emits a statically imported
  `.wasm` module the bundler ships — and it still works under `next dev`.
- `@opennextjs/cloudflare` requires Next `>=16.4.5` for Next 16.
- The deployed bundle is ~19 MB gzipped (Next + OpenNext + Prisma's wasm query compiler).
