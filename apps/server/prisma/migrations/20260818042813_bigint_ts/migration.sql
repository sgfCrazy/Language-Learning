/*
  Warnings:

  - You are about to alter the column `clientTimestamp` on the `PracticeRecord` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
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
CREATE UNIQUE INDEX "PracticeRecord_userId_sentenceId_clientTimestamp_key" ON "PracticeRecord"("userId", "sentenceId", "clientTimestamp");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
