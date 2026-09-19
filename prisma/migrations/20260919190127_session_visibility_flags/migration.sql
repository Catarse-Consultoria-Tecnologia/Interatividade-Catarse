-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "distributionVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "highestRevealedRound" INTEGER NOT NULL DEFAULT 0;
