-- DropForeignKey
ALTER TABLE "guildmemberships" DROP CONSTRAINT "guildmemberships_roleId_fkey";

-- AddForeignKey
ALTER TABLE "guildmemberships" ADD CONSTRAINT "guildmemberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "guildroles"("roleId") ON DELETE CASCADE ON UPDATE CASCADE;
