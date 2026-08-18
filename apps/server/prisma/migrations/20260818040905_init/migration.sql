-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserAuth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "revokedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoursePack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT NOT NULL DEFAULT '',
    "level" TEXT NOT NULL DEFAULT 'beginner',
    "tags" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coursePackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Course_coursePackId_fkey" FOREIGN KEY ("coursePackId") REFERENCES "CoursePack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sentence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "startMs" INTEGER,
    "endMs" INTEGER,
    "tokens" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sentence_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserCoursePack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "coursePackId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserCoursePack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserCoursePack_coursePackId_fkey" FOREIGN KEY ("coursePackId") REFERENCES "CoursePack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'zh_to_en',
    "sentenceOrder" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourseProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sentenceId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "clientTimestamp" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeRecord_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "Sentence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserVocab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "dueAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "ease" REAL NOT NULL DEFAULT 2.5,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserVocab_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserAuth_userId_idx" ON "UserAuth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuth_provider_externalId_key" ON "UserAuth"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "CoursePack_level_idx" ON "CoursePack"("level");

-- CreateIndex
CREATE INDEX "Course_coursePackId_idx" ON "Course"("coursePackId");

-- CreateIndex
CREATE INDEX "Sentence_courseId_idx" ON "Sentence"("courseId");

-- CreateIndex
CREATE INDEX "UserCoursePack_userId_idx" ON "UserCoursePack"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCoursePack_userId_coursePackId_key" ON "UserCoursePack"("userId", "coursePackId");

-- CreateIndex
CREATE INDEX "CourseProgress_userId_idx" ON "CourseProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseProgress_userId_courseId_key" ON "CourseProgress"("userId", "courseId");

-- CreateIndex
CREATE INDEX "PracticeRecord_userId_courseId_idx" ON "PracticeRecord"("userId", "courseId");

-- CreateIndex
CREATE INDEX "PracticeRecord_sentenceId_idx" ON "PracticeRecord"("sentenceId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeRecord_userId_sentenceId_clientTimestamp_key" ON "PracticeRecord"("userId", "sentenceId", "clientTimestamp");

-- CreateIndex
CREATE INDEX "UserVocab_userId_status_idx" ON "UserVocab"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserVocab_userId_word_key" ON "UserVocab"("userId", "word");
