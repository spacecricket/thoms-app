export interface Event {
  eventId: number;
  name: string; // eg "Spttc Sunday U-1300 League 06/07/2026",
  startDateTime: string; // eg "2026-06-07T04:00:00",
  endDateTime: string; // eg "2026-06-07T04:00:00",
  beginRating: number;
  finalRating: number;
  difference: number;
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
}

export interface PlayerEventsHistory {
  success: boolean;
  message: string;
  data: {
    events: Event[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
  },
  // permissions: null,
  // errors: null,
  statusCode: 200,
  // errorCode: '',
  // traceId: null
}

export interface Match {
  matchId: number;
  competitionId: number;
  roundId: number;
  competitionName: string; // ETTA Wednesday League 09/16/2026;
  eventName: string; // ETTA Wednesday League 09/16/2026;
  matchDate: string; // 2026-09-16T04:00:00;
  startDateTime: string; // 2026-09-16T04:00:00;
  winnerParticipantId: string; // 7E78D830-53B2-42E8-BB70-6C2A0CE298C2;
  winnerMemberId: number;
  prefixedWinnerId: string; // USATT# 287622;
  winnerName: string; // Thom Sonavane;
  winnerBeginRating: number;
  winnerFinalRating: number;
  winnerRatingChange: number;
  winnerRatingChangeStatus: number;
  winnerDifference: number;
  winnerGender: string;
  loserParticipantId: string; // 93DA011C-57D6-41E6-B4A3-BC7769ADAFB8;
  loserMemberId: number; // 290919;
  prefixedLoserId: string; // USATT# 290919;
  loserName: string; // Andrey Mironenko;
  loserBeginRating: number;
  loserFinalRating: number;
  loserRatingChange: number;
  loserRatingChangeStatus: number;
  loserDifference: number;
  loserGender: string; // Male;
  winnerImageUrl: string; // https://USATT.justgo.com/store/downloadPublic?f=d04b0b8f-a105-49bb-9335-5ca2ad165919.png&t=user&p=144276;
  loserImageUrl: string; // ;
  matchScores: string; // 3-0;
  isCompleted: boolean;
  totalRecords: number;
}

export interface PlayerMatchHistory {
  success: boolean;
  message: string; // Request successful;
  data: {
    playerSummary: {
      playerId: string; // 7E78D830-53B2-42E8-BB70-6C2A0CE298C2;
      playerName: string; // Thom Sonavane;
      playerGender: string; // Male;
      country: string; // United States
    };
    matches: Match[];
    startDateTime: string; // 2026-09-16T04:00:00;
    eventName: string; // ETTA Wednesday League 09/16/2026;
    formattedStartDate: string; // 16 Sep 2026;
    formattedStartTime: string; // 04:00;
    totalCount: number; // 5;
    pageNumber: number; // 1;
    pageSize: number; // 10
  };
  // permissions: null;
  // errors: null;
  statusCode: number; // 200;
  // errorCode: "";
  // "traceId": null
}

export interface ScrapedEvent {
  id: string;
  name: string;
  date: string; // ISO YYYY-MM-DD
  ratingBefore: number | null;
  ratingAfter: number;
  won: number;
  lost: number;
  played: number;
  alreadyImported: boolean;
  importedAt: string | null;
}

export interface ScrapedMatch {
  opponentUsattId: string;
  opponentName: string;
  thomSets: number;
  opponentSets: number;
  scoreString: string;
  thomWon: boolean;
  thomRatingBefore: number;
  thomRatingAfter: number;
}

export interface ScrapedEventDetail extends ScrapedEvent {
  matches: ScrapedMatch[];
}

export interface H2HMatchDetail {
  date: string;
  eventId: string;
  eventName: string;
  matchId: number;
  thomSets: number;
  opponentSets: number;
  thomWon: boolean;
  linkedLiveMatchId: string | null;
}

export interface H2HRow {
  opponentName: string;
  won: number;
  lost: number;
  total: number;
  winPct: number;
  scores: string[];
  matchDetails: H2HMatchDetail[];
}

export interface MatchRecord {
  id: number;
  opponentUsattId: string;
  opponentName: string;
  thomSets: number;
  opponentSets: number;
  thomWon: boolean;
  eventId: string;
  /** ID of the linked LiveMatch, if one has been linked by an admin */
  linkedLiveMatchId: string | null;
}

export interface AnalysisData {
  player: {
    name: string;
    usattId: string;
    currentRating: number;
    totalEvents: number;
    totalMatches: number;
    totalWon: number;
    totalLost: number;
    winPct: number;
    ratingGain: number;
  };
  ratingTimeline: {
    id: string;
    date: string;
    name: string;
    ratingBefore: number | null;
    ratingAfter: number;
    won: number;
    lost: number;
    hasNotes: boolean;
  }[];
  headToHead: H2HRow[];
  matches: MatchRecord[];
}
