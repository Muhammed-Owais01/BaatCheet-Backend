-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "guildId" TEXT;

-- CreateTable
CREATE TABLE "guilds" (
    "guildId" TEXT NOT NULL,
    "guildName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "guildroles" (
    "roleId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "guildId" TEXT NOT NULL,

    CONSTRAINT "guildroles_pkey" PRIMARY KEY ("roleId")
);

-- CreateTable
CREATE TABLE "guildmemberships" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "guildmemberships_pkey" PRIMARY KEY ("guildId","userId")
);

-- CreateIndex
CREATE INDEX "guildroles_guildId_idx" ON "guildroles"("guildId");

-- CreateIndex
CREATE INDEX "guildmemberships_userId_idx" ON "guildmemberships"("userId");

-- CreateIndex
CREATE INDEX "chats_guildId_idx" ON "chats"("guildId");

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guildroles" ADD CONSTRAINT "guildroles_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guildmemberships" ADD CONSTRAINT "guildmemberships_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guildmemberships" ADD CONSTRAINT "guildmemberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guildmemberships" ADD CONSTRAINT "guildmemberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "guildroles"("roleId") ON DELETE RESTRICT ON UPDATE CASCADE;
