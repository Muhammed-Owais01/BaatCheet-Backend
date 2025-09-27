/*
  Warnings:

  - The primary key for the `requests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `requestId` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `requests` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "requests_requesterId_receiverId_key";

-- AlterTable
ALTER TABLE "requests" DROP CONSTRAINT "requests_pkey",
DROP COLUMN "requestId",
DROP COLUMN "status",
ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("requesterId", "receiverId");
