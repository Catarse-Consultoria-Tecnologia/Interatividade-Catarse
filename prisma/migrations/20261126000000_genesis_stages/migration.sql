-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'ACTIVE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SessionEventType" ADD VALUE 'GENESIS_ANSWER_SUBMITTED';
ALTER TYPE "SessionEventType" ADD VALUE 'GENESIS_STAGE_COMPLETED';

-- CreateTable
CREATE TABLE "genesis_stages" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "scriptLabel" TEXT,
    "script" TEXT,

    CONSTRAINT "genesis_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genesis_questions" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,

    CONSTRAINT "genesis_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genesis_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "genesis_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genesis_answers" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "genesis_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "genesis_stages_gameId_key_key" ON "genesis_stages"("gameId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "genesis_questions_stageId_order_key" ON "genesis_questions"("stageId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "genesis_options_questionId_order_key" ON "genesis_options"("questionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "genesis_answers_sessionId_participantId_questionId_key" ON "genesis_answers"("sessionId", "participantId", "questionId");

-- AddForeignKey
ALTER TABLE "genesis_stages" ADD CONSTRAINT "genesis_stages_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genesis_questions" ADD CONSTRAINT "genesis_questions_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "genesis_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genesis_options" ADD CONSTRAINT "genesis_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "genesis_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genesis_answers" ADD CONSTRAINT "genesis_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genesis_answers" ADD CONSTRAINT "genesis_answers_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genesis_answers" ADD CONSTRAINT "genesis_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "genesis_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genesis_answers" ADD CONSTRAINT "genesis_answers_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "genesis_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

