-- CreateTable
CREATE TABLE "WorkoutType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkoutType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "scheduleMode" TEXT NOT NULL,
    "pattern" JSONB NOT NULL,
    "startWeight" DOUBLE PRECISION,
    "goalWeight" DOUBLE PRECISION,
    "calTarget" INTEGER NOT NULL,
    "proteinTarget" INTEGER NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Day" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "workoutTypeId" TEXT NOT NULL,
    "trained" BOOLEAN NOT NULL DEFAULT false,
    "weight" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "Day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" INTEGER NOT NULL,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "itemId" TEXT,
    "name" TEXT,
    "calories" INTEGER NOT NULL,
    "protein" INTEGER NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutType_name_key" ON "WorkoutType"("name");

-- CreateIndex
CREATE INDEX "Day_date_idx" ON "Day"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Day_blockId_date_key" ON "Day"("blockId", "date");

-- CreateIndex
CREATE INDEX "Entry_dayId_idx" ON "Entry"("dayId");

-- AddForeignKey
ALTER TABLE "Day" ADD CONSTRAINT "Day_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Day" ADD CONSTRAINT "Day_workoutTypeId_fkey" FOREIGN KEY ("workoutTypeId") REFERENCES "WorkoutType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "FoodItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
