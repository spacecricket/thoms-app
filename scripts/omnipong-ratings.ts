/**
 * CLI wrapper around lib/tournament-ratings: scrapes an OmniPong tournament and
 * prints every player's predicted USATT rating, writing a CSV alongside.
 *
 * Usage:
 *   npx tsx scripts/omnipong-ratings.ts [tournamentId]
 *   npm run ratings:omnipong -- 6328
 *
 * Pages are cached in /tmp/omnipong-<id> so repeat runs are fast (delete the
 * folder to refetch).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { predictTournamentRatings, type FetchHtml } from "../lib/tournament-ratings";

const TOURNAMENT_ID = process.argv[2] ?? "6328";
const CACHE_DIR = `/tmp/omnipong-${TOURNAMENT_ID}`;

const cachedFetch: FetchHtml = async (name, url) => {
  const path = `${CACHE_DIR}/${name}.html`;
  if (existsSync(path)) return readFileSync(path, "utf8");
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (thoms-app tournament rating predictor)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      writeFileSync(path, html);
      return html;
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
};

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });

  const data = await predictTournamentRatings(TOURNAMENT_ID, { fetchHtml: cachedFetch });
  const { summary, players } = data;

  console.error(`${data.tournament.name} (r=${TOURNAMENT_ID})`);
  console.error(
    `players: ${summary.players}, matches: ${summary.matches}, adjusted: ${summary.adjusted}, ` +
      `unrated: ${summary.unrated}, unresolved: ${summary.unresolved}, uncertain: ${summary.uncertain}`,
  );
  if (summary.unmatchedMatches > 0) {
    console.error(`WARN: ${summary.unmatchedMatches} match(es) not seen on both players' pages`);
  }

  const csv = [
    "player,initial_rating,wins,losses,adjustment,adjusted_rating,final_rating,rating_change,uncertain,note",
    ...players.map((r) =>
      [
        `"${r.name}"`,
        r.initialRating,
        r.wins,
        r.losses,
        r.adjustment,
        r.adjustedRating ?? "",
        r.finalRating ?? "",
        r.ratingChange ?? "",
        r.uncertain ? "yes" : "no",
        `"${r.notes.join("; ")}"`,
      ].join(","),
    ),
  ].join("\n");
  const outPath = `scripts/data/omnipong-${TOURNAMENT_ID}-ratings.csv`;
  mkdirSync("scripts/data", { recursive: true });
  writeFileSync(outPath, csv + "\n");
  console.error(`wrote ${outPath}`);

  const fmt = (v: number | null) => (v === null ? "n/a" : String(v));
  const lines = players.map((r) => {
    const adj =
      r.adjustment === "standard" || r.adjustment === "special"
        ? `${fmt(r.adjustedRating)} (${r.adjustment})`
        : r.adjustment === "initial"
          ? `${fmt(r.adjustedRating)} (initial)`
          : fmt(r.adjustedRating);
    const final = r.finalRating === null ? "n/a" : `${r.finalRating}${r.uncertain ? "*" : ""}`;
    return `| ${r.name} | ${r.initialRating || "NR"} | ${r.wins} | ${r.losses} | ${adj} | ${final} |`;
  });
  console.log("| Player | Initial | W | L | Adjusted | Final |");
  console.log("| --- | ---: | ---: | ---: | ---: | ---: |");
  console.log(lines.join("\n"));

  const unresolved = players.filter((r) => r.finalRating === null);
  if (unresolved.length) {
    console.error(`\n${unresolved.length} player(s) could not be finalized:`);
    for (const r of unresolved) console.error(`  ${r.name}: ${r.notes.join("; ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
