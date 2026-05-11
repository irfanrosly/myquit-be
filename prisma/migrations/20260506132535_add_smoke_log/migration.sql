-- CreateTable
CREATE TABLE "SmokeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loggedDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmokeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmokeLog_userId_loggedDate_idx" ON "SmokeLog"("userId", "loggedDate");

-- CreateIndex
CREATE INDEX "SmokeLog_userId_loggedAt_idx" ON "SmokeLog"("userId", "loggedAt");

-- AddForeignKey
ALTER TABLE "SmokeLog" ADD CONSTRAINT "SmokeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
