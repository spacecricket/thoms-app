# thom's app

A hobby project built to explore vibe coding — the practice of building software through natural conversation with AI, letting ideas flow directly into working code and watching your competence slowly drain away ;).

The public view is live at **[https://thom.so](https://thom.so)**.

## What this app does

This is a personal table tennis stats tracker built around one player: Thom. It pulls match results from USATT (the US governing body for table tennis) via JustGo, their competition management platform, and presents them in a dashboard with:

- **Match history** — every competitive result, organised by event, with win/loss record and rating progression over time
- **Head-to-head breakdowns** — drill into any opponent to see the full history of matches, set scores, and trends
- **Live match recorder** — an iPad-optimised point-by-point recording interface for capturing matches in real time, including shot type (loop, push, drive, etc.), backhand vs forehand, whether the shot was a winner or an error, and who was serving
- **Play-by-play viewer** — a public page to watch a recorded match unfold point by point, with shot-level analysis including winner/error counts and a breakdown by shot type per player
- **Event linking** — recorded live matches can be linked to the corresponding JustGo result so the play-by-play is surfaced directly from the match history

## A note on the data

The match history view is intentionally hardcoded for Thom. USATT match data belongs to USATT and I don't have the rights to build a general-purpose product on top of it. This is a personal project, not a platform.

You can browse the non-admin public view at **[https://thom.so](https://thom.so)**.

## Tech stack

- **Next.js 14** (App Router, server + client components)
- **Prisma** with **PostgreSQL** (hosted on [Neon](https://neon.tech))
- **Tailwind CSS**
- Deployed on **[Fly.io](https://fly.io)**

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

You'll need a `.env` file with a `DATABASE_URL` pointing at a Neon (or any Postgres) database, and an `ADMIN_PASSWORD` for the live recording interface.

```bash
pnpm prisma migrate deploy   # apply migrations
pnpm prisma generate         # generate the Prisma client
```

## Deploying

The app is containerised and deployed to Fly.io:

```bash
fly deploy
```

Configuration lives in `fly.toml`. The app runs in the `sjc` (San Jose) region on a shared 1 CPU / 2 GB machine.
