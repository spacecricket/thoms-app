-- Add match_date to live_matches (default to today for existing rows)
ALTER TABLE "live_matches"
  ADD COLUMN "match_date" DATE NOT NULL DEFAULT CURRENT_DATE;
