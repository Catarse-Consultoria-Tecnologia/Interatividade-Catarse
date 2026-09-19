-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('ENTITY', 'INSTITUTION_TYPE', 'CONCEPT', 'CASE');

-- CreateEnum
CREATE TYPE "EvidenceStrength" AS ENUM ('STRONG', 'COMPLEMENTARY', 'WEAK', 'DECOY');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('CREATED', 'LOBBY', 'BRIEFING', 'ROUND_OPEN', 'ROUND_FROZEN', 'REVEAL', 'NEXT_ROUND', 'FINAL', 'CLOSED');

-- CreateEnum
CREATE TYPE "ScoreCategory" AS ENUM ('CLASSIFICATION_CORRECT', 'SUPERVISOR_CORRECT', 'EVIDENCE_CORRECT', 'INSUFFICIENT_CORRECT', 'GOOD_JUSTIFICATION');

-- CreateEnum
CREATE TYPE "SessionEventType" AS ENUM ('PARTICIPANT_JOINED', 'PARTICIPANT_REMOVED', 'PARTICIPANT_RENAMED', 'HYPOTHESIS_REGISTERED', 'HYPOTHESIS_REVISED', 'CLUE_RELEASED', 'EVIDENCE_ASSOCIATED', 'SCENARIO_RESPONSE_SAVED', 'ROUND_FROZEN', 'ROUND_RESUMED', 'ROUND_REVEALED', 'ROUND_ADVANCED', 'SESSION_PAUSED', 'SESSION_RESUMED', 'SESSION_FINISHED', 'SESSION_CLOSED');

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" "GameStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT NOT NULL,
    "cardType" "CardType" NOT NULL,
    "technicalNote" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_answers" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 100,
    "technicalNote" TEXT,
    "acceptsInsufficientAsCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "card_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clues" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "clues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidences" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "strength" "EvidenceStrength" NOT NULL,

    CONSTRAINT "evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_documents" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "scenario_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_items" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "service" TEXT NOT NULL,
    "expectedResponsavel" TEXT NOT NULL,
    "expectedTipo" TEXT NOT NULL,
    "expectedSupervisor" TEXT NOT NULL,
    "expectedEvidenceKey" TEXT,

    CONSTRAINT "scenario_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostToken" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'CREATED',
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "totalRounds" INTEGER NOT NULL DEFAULT 4,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lobbyLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placements" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "isRevision" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_clues" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "clueId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_clues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_associations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_responses" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "scenarioItemId" TEXT NOT NULL,
    "responsavel" TEXT,
    "tipo" TEXT,
    "supervisor" TEXT,
    "evidence" TEXT,
    "markedInsufficient" BOOLEAN NOT NULL DEFAULT false,
    "justification" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_entries" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "category" "ScoreCategory" NOT NULL,
    "points" INTEGER NOT NULL,
    "cardId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_badges" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participant_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "SessionEventType" NOT NULL,
    "participantId" TEXT,
    "cardId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "zones_gameId_key_key" ON "zones"("gameId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "cards_gameId_key_key" ON "cards"("gameId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "card_answers_cardId_key" ON "card_answers"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "clues_cardId_order_key" ON "clues"("cardId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "evidences_gameId_key_key" ON "evidences"("gameId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "scenarios_gameId_key_key" ON "scenarios"("gameId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_documents_scenarioId_key_key" ON "scenario_documents"("scenarioId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_items_scenarioId_service_key" ON "scenario_items"("scenarioId", "service");

-- CreateIndex
CREATE UNIQUE INDEX "badges_gameId_key_key" ON "badges"("gameId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_code_key" ON "sessions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_hostToken_key" ON "sessions"("hostToken");

-- CreateIndex
CREATE UNIQUE INDEX "participants_token_key" ON "participants"("token");

-- CreateIndex
CREATE UNIQUE INDEX "participants_sessionId_token_key" ON "participants"("sessionId", "token");

-- CreateIndex
CREATE INDEX "placements_sessionId_participantId_cardId_createdAt_idx" ON "placements"("sessionId", "participantId", "cardId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "session_clues_sessionId_clueId_key" ON "session_clues"("sessionId", "clueId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_associations_sessionId_participantId_cardId_eviden_key" ON "evidence_associations"("sessionId", "participantId", "cardId", "evidenceId");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_responses_sessionId_participantId_scenarioItemId_key" ON "scenario_responses"("sessionId", "participantId", "scenarioItemId");

-- CreateIndex
CREATE UNIQUE INDEX "participant_badges_sessionId_participantId_badgeId_key" ON "participant_badges"("sessionId", "participantId", "badgeId");

-- CreateIndex
CREATE INDEX "session_events_sessionId_createdAt_idx" ON "session_events"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_answers" ADD CONSTRAINT "card_answers_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_answers" ADD CONSTRAINT "card_answers_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clues" ADD CONSTRAINT "clues_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_documents" ADD CONSTRAINT "scenario_documents_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_items" ADD CONSTRAINT "scenario_items_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_clues" ADD CONSTRAINT "session_clues_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_clues" ADD CONSTRAINT "session_clues_clueId_fkey" FOREIGN KEY ("clueId") REFERENCES "clues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_associations" ADD CONSTRAINT "evidence_associations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_associations" ADD CONSTRAINT "evidence_associations_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_associations" ADD CONSTRAINT "evidence_associations_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_associations" ADD CONSTRAINT "evidence_associations_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_responses" ADD CONSTRAINT "scenario_responses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_responses" ADD CONSTRAINT "scenario_responses_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_responses" ADD CONSTRAINT "scenario_responses_scenarioItemId_fkey" FOREIGN KEY ("scenarioItemId") REFERENCES "scenario_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_entries" ADD CONSTRAINT "score_entries_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_entries" ADD CONSTRAINT "score_entries_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_badges" ADD CONSTRAINT "participant_badges_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_badges" ADD CONSTRAINT "participant_badges_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_badges" ADD CONSTRAINT "participant_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
