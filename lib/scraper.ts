import type { ScrapedEvent, ScrapedMatch, ScrapedEventDetail, PlayerEventsHistory, PlayerMatchHistory } from "./types";

const PLAYER_ID = "7E78D830-53B2-42E8-BB70-6C2A0CE298C2";
const RESULT_EVENT_TYPE_ID = "FA4D9651-1327-40DF-BFB9-7A6768AD4931";
const TENANT_ID = 'kHg2JkXVEINeqZNiNQiMtA==';

const REST_URL = 'https://justgorestapi-prod-us.justgo.com';
const ORIGIN = 'https://justgousatt2-dpedf8b3ekgef0fh.centralus-01.azurewebsites.net';

export async function fetchPlayerEventsHistory(): Promise<PlayerEventsHistory> {
  const url = new URL(`${REST_URL}/api/v1/events-results/get-player-events-history`);
  
  url.search = new URLSearchParams({
    PlayerId: PLAYER_ID,
    PageSize: '20',
    PageNumber: '1',
    ResultEventTypeId: RESULT_EVENT_TYPE_ID,
  }).toString();

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Tenant-Id': TENANT_ID,
      'Origin': ORIGIN,
      'Accept': 'application/json, text/plain, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

export async function fetchPlayerMatchHistory(eventId: string): Promise<PlayerMatchHistory> {
  const url = new URL(`${REST_URL}/api/v1/events-results/get-player-match-history`);
  
  url.search = new URLSearchParams({
    PlayerId: PLAYER_ID,
    PageSize: '20',
    PageNumber: '1',
    EventId: eventId,
    ResultEventTypeId: RESULT_EVENT_TYPE_ID,
  }).toString();

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Tenant-Id': TENANT_ID,
      'Origin': ORIGIN,
      'Accept': 'application/json, text/plain, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function scrapeEventsList(
  importedIds: Record<string, string>,
): Promise<ScrapedEvent[]> {
  const playerEventsHistory = await fetchPlayerEventsHistory();

  return playerEventsHistory.data.events.map((ev) => {
    return {
      id: String(ev.eventId),
      name: ev.name,
      date: ev.startDateTime.split("T")[0], // ISO YYYY-MM-DD
      ratingBefore: ev.beginRating,
      ratingAfter: ev.finalRating,
      won: ev.totalWins,
      lost: ev.totalLosses,
      played: ev.totalMatches,
      alreadyImported: ev.eventId in importedIds,
      importedAt: importedIds[ev.eventId] ?? null
    }
  })
}

export async function scrapeEventDetail(
  eventId: string,
): Promise<ScrapedEventDetail> {
  const { data } = await fetchPlayerMatchHistory(eventId);
  
  const matches: ScrapedMatch[] = [];
  let ratingBefore = 0;
  let ratingAfter = 0;
  let won = 0;
  let lost = 0;

  for (const match of data.matches) {
    const thomWon = match.winnerParticipantId === PLAYER_ID;
    const scoreString = match.matchScores;
    const winningSets = Number(scoreString.split("-")[0]);
    const losingSets = Number(scoreString.split("-")[1]);

    if (thomWon) {
      won++;
      ratingBefore = match.winnerBeginRating;
      ratingAfter = match.winnerFinalRating;
    } else {
      lost++;
      ratingBefore = match.loserBeginRating;
      ratingAfter = match.loserFinalRating;
    }

    matches.push({
      opponentUsattId: thomWon ? String(match.loserMemberId) : String(match.winnerMemberId),
      opponentName:  thomWon ? match.loserName : match.winnerName,
      thomSets: thomWon ? winningSets : losingSets,
      opponentSets: thomWon ? losingSets : winningSets,
      scoreString,
      thomWon,
      thomRatingBefore: ratingBefore,
      thomRatingAfter: ratingAfter
    })
  }

  return {
    id: eventId,
    name: data.eventName,
    date: data.startDateTime.split("T")[0],
    ratingBefore,
    ratingAfter,
    won,
    lost,
    played: won + lost,
    alreadyImported: false,
    importedAt: null,
    matches,
  };
}
