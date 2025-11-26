-- CreateTable
CREATE TABLE "guildbans" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "guildbans_pkey" PRIMARY KEY ("guildId","userId")
);

-- CreateIndex
CREATE INDEX "guildbans_userId_idx" ON "guildbans"("userId");

-- CreateIndex
CREATE INDEX "guildbans_guildId_idx" ON "guildbans"("guildId");

-- AddForeignKey
ALTER TABLE "guildbans" ADD CONSTRAINT "guildbans_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guildbans" ADD CONSTRAINT "guildbans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
