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
  eventName: string;
  thomSets: number;
  opponentSets: number;
  thomWon: boolean;
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
  opponentUsattId: string;
  opponentName: string;
  thomSets: number;
  opponentSets: number;
  thomWon: boolean;
  eventId: string;
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
  }[];
  headToHead: H2HRow[];
  matches: MatchRecord[];
}
