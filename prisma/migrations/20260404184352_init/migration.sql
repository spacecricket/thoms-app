-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "rating_before" INTEGER,
    "rating_after" INTEGER NOT NULL,
    "won" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opponents" (
    "usatt_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "opponents_pkey" PRIMARY KEY ("usatt_id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "event_id" TEXT NOT NULL,
    "opponent_usatt_id" TEXT NOT NULL,
    "thom_sets" INTEGER NOT NULL,
    "opponent_sets" INTEGER NOT NULL,
    "score_string" TEXT NOT NULL,
    "thom_won" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_event_date_idx" ON "events"("event_date");

-- CreateIndex
CREATE INDEX "matches_event_id_idx" ON "matches"("event_id");

-- CreateIndex
CREATE INDEX "matches_opponent_usatt_id_idx" ON "matches"("opponent_usatt_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_opponent_usatt_id_fkey" FOREIGN KEY ("opponent_usatt_id") REFERENCES "opponents"("usatt_id") ON DELETE RESTRICT ON UPDATE CASCADE;
