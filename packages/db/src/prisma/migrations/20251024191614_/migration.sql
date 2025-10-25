/*
  Warnings:

  - The primary key for the `guildmemberships` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "guildmemberships" DROP CONSTRAINT "guildmemberships_pkey",
ADD CONSTRAINT "guildmemberships_pkey" PRIMARY KEY ("guildId", "userId", "roleId");
