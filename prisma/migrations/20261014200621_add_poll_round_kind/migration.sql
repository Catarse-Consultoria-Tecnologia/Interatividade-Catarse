-- CreateEnum
CREATE TYPE "RoundKind" AS ENUM ('PLACEMENT', 'EVIDENCE_MATCH', 'SCENARIO', 'POLL');

-- AlterEnum
ALTER TYPE "SessionEventType" ADD VALUE 'POLL_VOTED';

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "roundIntros" TEXT[],
ADD COLUMN     "roundKinds" "RoundKind"[],
ADD COLUMN     "roundLabels" TEXT[];

-- CreateTable
CREATE TABLE "poll_questions" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" TEXT[],

    CONSTRAINT "poll_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_responses" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poll_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "poll_questions_gameId_key_key" ON "poll_questions"("gameId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "poll_responses_sessionId_participantId_questionId_key" ON "poll_responses"("sessionId", "participantId", "questionId");

-- AddForeignKey
ALTER TABLE "poll_questions" ADD CONSTRAINT "poll_questions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "poll_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
