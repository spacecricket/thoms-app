-- CreateTable: live match recording sessions
CREATE TABLE "live_matches" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "opponent_name" TEXT NOT NULL,
    "opponent_usatt_id" TEXT,
    "thom_side" TEXT NOT NULL,
    "toss_winner" TEXT NOT NULL,
    "first_server" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "linked_match_id" INTEGER,

    CONSTRAINT "live_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable: individual points within a live match
CREATE TABLE "live_points" (
    "id" TEXT NOT NULL,
    "live_match_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "set_number" INTEGER NOT NULL,
    "point_in_set" INTEGER NOT NULL,
    "server_thom" BOOLEAN NOT NULL,
    "thom_won" BOOLEAN NOT NULL,
    "thom_set_score" INTEGER NOT NULL,
    "opp_set_score" INTEGER NOT NULL,
    "thom_sets_won" INTEGER NOT NULL,
    "opp_sets_won" INTEGER NOT NULL,
    "set_complete" BOOLEAN NOT NULL DEFAULT false,
    "match_complete" BOOLEAN NOT NULL DEFAULT false,
    "shot_type" TEXT,
    "shot_by" TEXT,
    "point_type" TEXT,

    CONSTRAINT "live_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_points_live_match_id_idx" ON "live_points"("live_match_id");

-- AddForeignKey
ALTER TABLE "live_points" ADD CONSTRAINT "live_points_live_match_id_fkey"
    FOREIGN KEY ("live_match_id") REFERENCES "live_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
