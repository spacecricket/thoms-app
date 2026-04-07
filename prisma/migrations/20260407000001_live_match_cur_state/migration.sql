-- Add materialised current-state columns to live_matches.
-- These are updated atomically alongside every LivePoint insert/delete
-- and also support direct manual score adjustments.
ALTER TABLE "live_matches"
  ADD COLUMN "cur_set_number"     INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "cur_thom_set_score" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cur_opp_set_score"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cur_thom_sets_won"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cur_opp_sets_won"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cur_match_complete" BOOLEAN NOT NULL DEFAULT false;
