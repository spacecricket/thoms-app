import { prisma } from "./prisma";
import type { AnalysisData, H2HRow, H2HMatchDetail, MatchRecord, ScrapedEventDetail } from "./types";

export async function getAnalysis(): Promise<AnalysisData> {
  const events = await prisma.event.findMany({
    orderBy: [{ eventDate: "asc" }, { scrapedAt: "asc" }],
  });

  const matches = await prisma.match.findMany({
    orderBy: { id: "asc" },
    include: { opponent: true },
  });

  // Build event lookup for match details
  const eventMap = new Map(events.map((e) => [e.id, e]));

  // Build head-to-head keyed by opponentUsattId, display by name
  const h2hMap = new Map<
    string,
    { opponentName: string; won: number; lost: number; scores: string[]; matchDetails: H2HMatchDetail[] }
  >();
  for (const m of matches) {
    const existing = h2hMap.get(m.opponentUsattId) ?? {
      opponentName: m.opponent.name,
      won: 0,
      lost: 0,
      scores: [],
      matchDetails: [],
    };
    if (m.thomWon) existing.won++;
    else existing.lost++;
    existing.scores.push(`${m.thomWon ? "W" : "L"} ${m.thomSets}-${m.opponentSets}`);
    const evt = eventMap.get(m.eventId);
    existing.matchDetails.push({
      date: evt?.eventDate.toISOString().split("T")[0] ?? "",
      eventName: evt?.name ?? "",
      thomSets: m.thomSets,
      opponentSets: m.opponentSets,
      thomWon: m.thomWon,
    });
    h2hMap.set(m.opponentUsattId, existing);
  }

  const headToHead: H2HRow[] = [...h2hMap.entries()]
    .map(([, { opponentName, won, lost, scores, matchDetails }]) => {
      const total = won + lost;
      matchDetails.sort((a, b) => a.date.localeCompare(b.date));
      return {
        opponentName,
        won,
        lost,
        total,
        winPct: total > 0 ? Math.round((100 * won) / total) : 0,
        scores,
        matchDetails,
      };
    })
    .sort((a, b) => b.total - a.total || a.opponentName.localeCompare(b.opponentName));

  const totalWon = matches.filter((m) => m.thomWon).length;
  const totalLost = matches.filter((m) => !m.thomWon).length;

  // Handle same-day events: use max ratingAfter from last date, min ratingBefore from first date
  const lastDate = events.length > 0 ? events[events.length - 1].eventDate.getTime() : null;
  const lastDayEvents = lastDate !== null ? events.filter((e) => e.eventDate.getTime() === lastDate) : [];
  const currentRating = lastDayEvents.length > 0
    ? Math.max(...lastDayEvents.map((e) => e.ratingAfter))
    : 0;

  const firstDate = events.length > 0 ? events[0].eventDate.getTime() : null;
  const firstDayEvents = firstDate !== null ? events.filter((e) => e.eventDate.getTime() === firstDate) : [];
  const startRating = firstDayEvents.length > 0
    ? Math.min(...firstDayEvents.map((e) => e.ratingBefore ?? e.ratingAfter))
    : 0;

  return {
    player: {
      name: "Thom Sonavane",
      usattId: "287622",
      currentRating,
      totalEvents: events.length,
      totalMatches: totalWon + totalLost,
      totalWon,
      totalLost,
      winPct:
        totalWon + totalLost > 0
          ? Math.round((100 * totalWon) / (totalWon + totalLost))
          : 0,
      ratingGain: events.length > 0 ? currentRating - startRating : 0,
    },
    ratingTimeline: events.map((e) => ({
      id: e.id,
      date: e.eventDate.toISOString().split("T")[0],
      name: e.name,
      ratingBefore: e.ratingBefore,
      ratingAfter: e.ratingAfter,
      won: e.won,
      lost: e.lost,
    })),
    headToHead,
    matches: matches.map((m) => ({
      opponentUsattId: m.opponentUsattId,
      opponentName: m.opponent.name,
      thomSets: m.thomSets,
      opponentSets: m.opponentSets,
      thomWon: m.thomWon,
      eventId: m.eventId,
    })),
  };
}

export async function upsertEvent(detail: ScrapedEventDetail): Promise<number> {
  return await prisma.$transaction(async (tx) => {
    await tx.event.upsert({
      where: { id: detail.id },
      create: {
        id: detail.id,
        name: detail.name,
        eventDate: new Date(detail.date),
        ratingBefore: detail.ratingBefore,
        ratingAfter: detail.ratingAfter,
        won: detail.won,
        lost: detail.lost,
      },
      update: {
        name: detail.name,
        eventDate: new Date(detail.date),
        ratingBefore: detail.ratingBefore,
        ratingAfter: detail.ratingAfter,
        won: detail.won,
        lost: detail.lost,
        scrapedAt: new Date(),
      },
    });

    // Delete old matches then insert fresh ones
    await tx.match.deleteMany({ where: { eventId: detail.id } });

    if (detail.matches.length > 0) {
      // Upsert all opponents first (name may have changed/corrected)
      for (const m of detail.matches) {
        await tx.opponent.upsert({
          where: { usattId: m.opponentUsattId },
          create: { usattId: m.opponentUsattId, name: m.opponentName },
          update: { name: m.opponentName },
        });
      }

      await tx.match.createMany({
        data: detail.matches.map((m) => ({
          eventId: detail.id,
          opponentUsattId: m.opponentUsattId,
          thomSets: m.thomSets,
          opponentSets: m.opponentSets,
          scoreString: m.scoreString,
          thomWon: m.thomWon,
        })),
      });
    }

    return detail.matches.length;
  });
}

export async function getImportedIds(): Promise<Record<string, string>> {
  const events = await prisma.event.findMany({
    select: { id: true, scrapedAt: true },
  });
  return Object.fromEntries(
    events.map((e) => [e.id, e.scrapedAt.toISOString()]),
  );
}
