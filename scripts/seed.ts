/**
 * Seed the database with previously scraped data.
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Requires DATABASE_URL in .env
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import matchDataRaw from "./match_data.json";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Competition data scraped from the events list page (all 50 events, oldest→newest)
const COMPETITIONS = [
  { id: "51517", date: "2025-03-22", name: "Spttc Saturday Night League", rb: null, ra: 717, won: 0, lost: 6 },
  { id: "32591", date: "2025-03-29", name: "Spttc Saturday Night League", rb: 717, ra: 667, won: 0, lost: 6 },
  { id: "36762", date: "2025-04-05", name: "Spttc Saturday Night League", rb: 667, ra: 661, won: 0, lost: 6 },
  { id: "41025", date: "2025-04-11", name: "Spttc Saturday Junior League", rb: 661, ra: 535, won: 1, lost: 5 },
  { id: "38946", date: "2025-04-12", name: "Spttc Saturday Night League", rb: 535, ra: 529, won: 0, lost: 4 },
  { id: "53820", date: "2025-04-19", name: "Spttc Saturday Night League", rb: 529, ra: 529, won: 0, lost: 7 },
  { id: "25034", date: "2025-04-26", name: "Spttc Saturday Night League", rb: 529, ra: 519, won: 0, lost: 6 },
  { id: "38260", date: "2025-05-04", name: "Spttc Saturday Night League", rb: 519, ra: 515, won: 2, lost: 2 },
  { id: "49499", date: "2025-05-10", name: "Spttc Saturday Night League", rb: 515, ra: 512, won: 0, lost: 5 },
  { id: "23873", date: "2025-05-16", name: "Spttc Saturday Junior League", rb: 512, ra: 485, won: 0, lost: 5 },
  { id: "41664", date: "2025-05-18", name: "Spttc Saturday Night League", rb: 485, ra: 448, won: 0, lost: 6 },
  { id: "50392", date: "2025-05-25", name: "Spttc Saturday Night League", rb: 448, ra: 437, won: 1, lost: 4 },
  { id: "54944", date: "2025-06-08", name: "Spttc Saturday Night League", rb: 437, ra: 438, won: 1, lost: 5 },
  { id: "32638", date: "2025-06-13", name: "Spttc Saturday Junior League", rb: 438, ra: 438, won: 1, lost: 4 },
  { id: "42200", date: "2025-06-14", name: "Spttc Saturday Night League", rb: 438, ra: 429, won: 0, lost: 7 },
  { id: "31085", date: "2025-07-13", name: "Spttc Saturday Night League", rb: 429, ra: 477, won: 2, lost: 4 },
  { id: "53606", date: "2025-07-20", name: "Spttc Saturday Night League", rb: 477, ra: 465, won: 0, lost: 5 },
  { id: "34736", date: "2025-07-27", name: "Spttc Saturday Night League", rb: 465, ra: 465, won: 0, lost: 4 },
  { id: "42063", date: "2025-08-03", name: "Spttc Saturday Night League", rb: 465, ra: 474, won: 1, lost: 4 },
  { id: "23479", date: "2025-08-09", name: "Spttc Saturday Junior League", rb: 474, ra: 585, won: 4, lost: 3 },
  { id: "42623", date: "2025-08-10", name: "Spttc Saturday Night League", rb: 585, ra: 633, won: 5, lost: 1 },
  { id: "40259", date: "2025-09-06", name: "Spttc Saturday Junior League", rb: 633, ra: 607, won: 1, lost: 2 },
  { id: "39796", date: "2025-09-07", name: "Spttc Saturday Night League", rb: 607, ra: 615, won: 2, lost: 3 },
  { id: "33535", date: "2025-09-12", name: "Spttc Saturday Junior League", rb: 615, ra: 621, won: 3, lost: 1 },
  { id: "27933", date: "2025-09-14", name: "Spttc Saturday Night League", rb: 621, ra: 669, won: 4, lost: 0 },
  { id: "44989", date: "2025-09-19", name: "Spttc Saturday Junior League", rb: 669, ra: 687, won: 2, lost: 3 },
  { id: "46201", date: "2025-09-21", name: "Spttc Saturday Night League", rb: 687, ra: 720, won: 1, lost: 4 },
  { id: "21897", date: "2025-09-26", name: "Spttc Saturday Junior League", rb: 720, ra: 723, won: 2, lost: 3 },
  { id: "43355", date: "2025-09-28", name: "Spttc Saturday Night League", rb: 723, ra: 711, won: 4, lost: 1 },
  { id: "44118", date: "2025-10-03", name: "Spttc Saturday Junior League", rb: 711, ra: 697, won: 1, lost: 4 },
  { id: "42708", date: "2025-10-05", name: "Spttc Saturday Night League", rb: 697, ra: 691, won: 1, lost: 4 },
  { id: "34570", date: "2025-10-18", name: "Spttc Saturday Junior League", rb: 691, ra: 678, won: 2, lost: 2 },
  { id: "39372", date: "2025-10-19", name: "Spttc Saturday Night League", rb: 678, ra: 762, won: 4, lost: 0 },
  { id: "33141", date: "2025-10-24", name: "Spttc Saturday Junior League", rb: 762, ra: 722, won: 1, lost: 4 },
  { id: "34237", date: "2025-10-26", name: "Spttc Saturday Night League", rb: 722, ra: 759, won: 1, lost: 5 },
  { id: "44441", date: "2025-10-31", name: "Spttc Saturday Junior League", rb: 759, ra: 728, won: 0, lost: 5 },
  { id: "49038", date: "2025-11-02", name: "Spttc Saturday Night League", rb: 728, ra: 732, won: 2, lost: 3 },
  { id: "49094", date: "2025-11-08", name: "Spttc Saturday Junior League", rb: 732, ra: 710, won: 0, lost: 4 },
  { id: "38859", date: "2025-11-09", name: "Spttc Saturday Night League", rb: 710, ra: 708, won: 2, lost: 3 },
  { id: "45629", date: "2025-11-15", name: "Spttc Saturday Junior League", rb: 708, ra: 663, won: 0, lost: 5 },
  { id: "47259", date: "2025-11-22", name: "Spttc Saturday Junior League", rb: 663, ra: 679, won: 4, lost: 0 },
  { id: "46090", date: "2025-11-23", name: "Spttc Saturday Night League", rb: 679, ra: 704, won: 3, lost: 2 },
  { id: "29600", date: "2025-11-29", name: "Spttc Saturday Junior League", rb: 704, ra: 686, won: 1, lost: 3 },
  { id: "47222", date: "2025-11-30", name: "Spttc Saturday Night League", rb: 686, ra: 695, won: 3, lost: 2 },
  { id: "50623", date: "2025-12-07", name: "Spttc Saturday Night League", rb: 695, ra: 706, won: 3, lost: 2 },
  { id: "30782", date: "2025-12-14", name: "Spttc Saturday Night League", rb: 706, ra: 712, won: 3, lost: 1 },
  { id: "21474", date: "2025-12-21", name: "Spttc Saturday Night League", rb: 712, ra: 766, won: 5, lost: 1 },
  { id: "55657", date: "2026-03-23", name: "Spttc Sunday U-1300 League 3/22/26", rb: 766, ra: 801, won: 3, lost: 2 },
  { id: "55658", date: "2026-03-29", name: "Spttc Saturday League 3/28/26", rb: 801, ra: 812, won: 1, lost: 4 },
  { id: "55659", date: "2026-03-29", name: "Spttc Junior League 3/28/26", rb: 801, ra: 813, won: 4, lost: 0 },
] as const;

const matchData = matchDataRaw as Record<
  string,
  { opponent: string; score: string; thom_won: boolean }[]
>;

function parseScore(score: string, thomWon: boolean) {
  const [a, b] = score.split("-").map(Number);
  return {
    thomSets: thomWon ? Math.max(a, b) : Math.min(a, b),
    opponentSets: thomWon ? Math.min(a, b) : Math.max(a, b),
  };
}

async function seed() {
  console.log("Seeding database...");

  for (const comp of COMPETITIONS) {
    await prisma.event.upsert({
      where: { id: comp.id },
      create: {
        id: comp.id,
        name: comp.name,
        eventDate: new Date(comp.date),
        ratingBefore: comp.rb,
        ratingAfter: comp.ra,
        won: comp.won,
        lost: comp.lost,
      },
      update: {
        name: comp.name,
        eventDate: new Date(comp.date),
        ratingBefore: comp.rb,
        ratingAfter: comp.ra,
        won: comp.won,
        lost: comp.lost,
      },
    });

    // Delete old matches and insert fresh
    await prisma.match.deleteMany({ where: { eventId: comp.id } });

    const matches = matchData[comp.id];
    if (matches?.length) {
      await prisma.match.createMany({
        data: matches.map((m) => {
          const { thomSets, opponentSets } = parseScore(m.score, m.thom_won);
          return {
            eventId: comp.id,
            opponentName: m.opponent,
            thomSets,
            opponentSets,
            scoreString: `${thomSets}-${opponentSets}`,
            thomWon: m.thom_won,
          };
        }),
      });
    }

    console.log(
      `  ${comp.id}: ${comp.name} (${comp.date}) — ${matches?.length ?? 0} matches`,
    );
  }

  const eventCount = await prisma.event.count();
  const matchCount = await prisma.match.count();
  console.log(`\nDone: ${eventCount} events, ${matchCount} matches`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
