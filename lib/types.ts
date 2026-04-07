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
