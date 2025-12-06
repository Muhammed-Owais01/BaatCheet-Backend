import { Prisma, User, type UserFriend, prismaClient } from "@baatcheet/db";
import { Creation, TransactionClient } from "../types/utils";

class UserFriendDAO {
  private static normalizeUserIds(userId: string, friendId: string) {
    return userId < friendId 
      ? { userId, friendId } 
      : { userId: friendId, friendId: userId };
  }
  
  static async create({ userId, friendId }: Creation<UserFriend, never>, tx?: TransactionClient) {
    const client = tx || prismaClient;
    const normalized = this.normalizeUserIds(userId, friendId);
    
    const [result] = await client.$queryRaw<UserFriend[]>`
      INSERT INTO "public"."userfriends" ("userId", "friendId", "createdAt", "updatedAt")
      VALUES (${normalized.userId}, ${normalized.friendId}, NOW(), NOW())
      RETURNING *;
    `;
    return result;
  }

  static async findFriendship(userId: string, friendId: string, tx?: TransactionClient) {
    const client = tx || prismaClient;
    const normalized = this.normalizeUserIds(userId, friendId);
    
    const [result] = await client.$queryRaw<UserFriend[]>`
      SELECT *
      FROM "public"."userfriends"
      WHERE "userId" = ${normalized.userId} AND "friendId" = ${normalized.friendId}
    `;
    return result ?? null;
  }

  static async getMutualFriendsByUserId(userId: string, tx?: TransactionClient) {
    const client = tx || prismaClient;
    
    // get all friendships for this user
    const friendships = await client.$queryRaw<
      Array<Pick<UserFriend, "userId" | "friendId" | "createdAt">>
    >`
      SELECT "userId", "friendId", "createdAt"
      FROM "public"."userfriends"
      WHERE "userId" = ${userId} OR "friendId" = ${userId}
    `;

    // extract friend IDs (the other user in each friendship)
    const friendIds = friendships.map((f: any) => 
      f.userId === userId ? f.friendId : f.userId
    );

    if (friendIds.length === 0) {
      return [];
    }

    // get user details for all friends
    const friends = await client.$queryRaw<
      Array<Pick<User, "userId" | "username" | "name">>
    >`--sql
      SELECT "userId", "username", "name"
      FROM "public"."users"
      WHERE "userId" IN (${Prisma.join(friendIds)})
    `;

    // get direct chats where both the user and each friend are members
    const directChats = await client.$queryRaw<
      Array<{ chatId: string; memberUserIds: string[] }>
    >`--sql
      SELECT 
        c."chatId",
        ARRAY_AGG(cm."userId") as "memberUserIds"
      FROM "public"."chats" c
      JOIN "public"."chatmemberships" cm ON c."chatId" = cm."chatId"
      WHERE c."type" = 'DIRECT'
        AND cm."userId" = ANY(ARRAY[${Prisma.join([userId, ...friendIds])}])
      GROUP BY c."chatId"
      HAVING COUNT(DISTINCT cm."userId") = 2
    `;

    // create a map of friendId then chatId for quick lookup
    const chatMap = new Map<string, string>();
    for (const chat of directChats) {
      const otherUserId = chat.memberUserIds.find((id: any) => id !== userId);
      if (otherUserId) {
        chatMap.set(otherUserId, chat.chatId);
      }
    }

    // create a map of friendId then createdAt
    const createdAtMap = new Map<string, Date>();
    for (const friendship of friendships) {
      const friendId = friendship.userId === userId ? friendship.friendId : friendship.userId;
      createdAtMap.set(friendId, friendship.createdAt);
    }

    // combine all data
    return friends.map((friend: any) => ({
      userId: friend.userId,
      username: friend.username,
      name: friend.name,
      createdAt: createdAtMap.get(friend.userId)!,
      chatId: chatMap.get(friend.userId) ?? null
    }));
  }

  static async delete({ userId, friendId }: Pick<UserFriend, "userId" | "friendId">, tx?: TransactionClient) {
    const client = tx || prismaClient;
    const normalized = this.normalizeUserIds(userId, friendId);
    
    const [result] = await client.$queryRaw<UserFriend[]>`
      DELETE FROM "public"."userfriends"
      WHERE "userId" = ${normalized.userId} AND "friendId" = ${normalized.friendId}
      RETURNING *;
    `;
    return result ?? null;
  }
}

export default UserFriendDAO;
