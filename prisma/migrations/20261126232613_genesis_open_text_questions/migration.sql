-- CreateEnum
CREATE TYPE "GenesisQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'OPEN_TEXT');

-- DropForeignKey
ALTER TABLE "genesis_answers" DROP CONSTRAINT "genesis_answers_optionId_fkey";

-- AlterTable
ALTER TABLE "genesis_answers" ADD COLUMN     "answerText" TEXT,
ALTER COLUMN "optionId" DROP NOT NULL,
ALTER COLUMN "isCorrect" DROP NOT NULL;

-- AlterTable
ALTER TABLE "genesis_questions" ADD COLUMN     "type" "GenesisQuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
ALTER COLUMN "explanation" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "genesis_answers" ADD CONSTRAINT "genesis_answers_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "genesis_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
