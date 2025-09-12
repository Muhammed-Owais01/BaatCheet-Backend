-- CreateTable
CREATE TABLE "chats" (
    "chatId" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("chatId")
);

-- CreateTable
CREATE TABLE "userfriends" (
    "userfriendId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,

    CONSTRAINT "userfriends_pkey" PRIMARY KEY ("userfriendId")
);

-- CreateIndex
CREATE UNIQUE INDEX "userfriends_userId_friendId_key" ON "userfriends"("userId", "friendId");

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userfriends" ADD CONSTRAINT "userfriends_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userfriends" ADD CONSTRAINT "userfriends_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
