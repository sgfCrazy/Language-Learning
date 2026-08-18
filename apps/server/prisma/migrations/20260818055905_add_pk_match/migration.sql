-- CreateTable
CREATE TABLE "PkMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "playerAId" TEXT NOT NULL,
    "playerBId" TEXT NOT NULL,
    "scoreA" INTEGER NOT NULL DEFAULT 0,
    "scoreB" INTEGER NOT NULL DEFAULT 0,
    "correctA" INTEGER NOT NULL DEFAULT 0,
    "correctB" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "coursePackId" TEXT,
    "questionCount" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PkMatch_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PkMatch_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PkMatch_roomId_key" ON "PkMatch"("roomId");

-- CreateIndex
CREATE INDEX "PkMatch_playerAId_createdAt_idx" ON "PkMatch"("playerAId", "createdAt");

-- CreateIndex
CREATE INDEX "PkMatch_playerBId_createdAt_idx" ON "PkMatch"("playerBId", "createdAt");
