-- CreateTable
CREATE TABLE "CoinTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoinTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "reward" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PracticeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sentenceId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "maxCombo" INTEGER NOT NULL DEFAULT 0,
    "scoreRate" REAL NOT NULL DEFAULT 0,
    "clientTimestamp" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeRecord_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "Sentence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PracticeRecord" ("attempts", "clientTimestamp", "correct", "courseId", "createdAt", "durationMs", "id", "mode", "score", "sentenceId", "userId") SELECT "attempts", "clientTimestamp", "correct", "courseId", "createdAt", "durationMs", "id", "mode", "score", "sentenceId", "userId" FROM "PracticeRecord";
DROP TABLE "PracticeRecord";
ALTER TABLE "new_PracticeRecord" RENAME TO "PracticeRecord";
CREATE INDEX "PracticeRecord_userId_courseId_idx" ON "PracticeRecord"("userId", "courseId");
CREATE INDEX "PracticeRecord_sentenceId_idx" ON "PracticeRecord"("sentenceId");
CREATE INDEX "PracticeRecord_userId_createdAt_idx" ON "PracticeRecord"("userId", "createdAt");
CREATE UNIQUE INDEX "PracticeRecord_userId_sentenceId_clientTimestamp_key" ON "PracticeRecord"("userId", "sentenceId", "clientTimestamp");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CoinTransaction_userId_createdAt_idx" ON "CoinTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyTask_userId_date_idx" ON "DailyTask"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTask_userId_date_type_key" ON "DailyTask"("userId", "date", "type");
