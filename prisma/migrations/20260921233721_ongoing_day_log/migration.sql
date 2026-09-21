-- DropForeignKey
ALTER TABLE "Day" DROP CONSTRAINT "Day_blockId_fkey";

-- DropForeignKey
ALTER TABLE "Day" DROP CONSTRAINT "Day_workoutTypeId_fkey";

-- DropIndex
DROP INDEX "Day_blockId_date_key";

-- DropIndex
DROP INDEX "Day_date_idx";

-- AlterTable
ALTER TABLE "Block" DROP COLUMN "pattern",
DROP COLUMN "scheduleMode",
ALTER COLUMN "endDate" DROP NOT NULL,
ALTER COLUMN "calTarget" DROP NOT NULL,
ALTER COLUMN "proteinTarget" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Day" DROP COLUMN "blockId",
ALTER COLUMN "workoutTypeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "scheduleMode" TEXT NOT NULL,
    "pattern" JSONB NOT NULL,
    "anchorDate" TEXT NOT NULL,
    "calTarget" INTEGER,
    "proteinTarget" INTEGER,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Day_date_key" ON "Day"("date");

-- AddForeignKey
ALTER TABLE "Day" ADD CONSTRAINT "Day_workoutTypeId_fkey" FOREIGN KEY ("workoutTypeId") REFERENCES "WorkoutType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

