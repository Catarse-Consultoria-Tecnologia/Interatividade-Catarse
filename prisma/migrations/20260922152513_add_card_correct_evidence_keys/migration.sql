-- AlterTable
ALTER TABLE "card_answers" ADD COLUMN     "correctEvidenceKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];
