import { Prisma, prismaClient } from "@baatcheet/db";
import { TransactionClient } from "../types/utils";

class ChatDAO {
  static normalizeUserIds(userAId: string, userBId: string) {
    return userAId < userBId
      ? { userAId, userBId }
      : { userAId: userBId, userBId: userAId };
  }

  /**
   * Find an existing DIRECT chat containing exactly the two users.
   */
  static async findDirectChatBetween(userAId: string, userBId: string, tx?: TransactionClient) {
    const [minId, maxId] = [userAId, userBId].sort();
    const client = (tx || prismaClient) as TransactionClient;
    const [chat] = await client.$queryRaw<any[]>`
      SELECT c.*
      FROM "public"."chats" c
      WHERE c."type" = 'DIRECT'
        AND EXISTS (SELECT 1 FROM "public"."chatmemberships" cm WHERE cm."chatId" = c."chatId" AND cm."userId" = ${minId})
        AND EXISTS (SELECT 1 FROM "public"."chatmemberships" cm2 WHERE cm2."chatId" = c."chatId" AND cm2."userId" = ${maxId})
      LIMIT 1;
    `;
    return chat ?? null;
  }

  static async findById(chatId: string, tx?: TransactionClient) {
    const client = (tx || prismaClient) as TransactionClient;
    const [chat] = await client.$queryRaw<any[]>`
      SELECT * FROM "public"."chats" WHERE "chatId" = ${chatId} LIMIT 1;
    `;
    return chat ?? null;
  }

  static async createGuildChatWithMembers(guildId: string, chatName: string, memberIds: string[], tx?: TransactionClient) {
    const client = (tx || prismaClient) as TransactionClient;
    const [chat] = await client.$queryRaw<any[]>`
      INSERT INTO "public"."chats" ("chatId", "guildId", "type", "name", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${guildId}, 'GROUP', ${chatName}, NOW(), NOW())
      RETURNING *;
    `;
    
    // Add all guild members to the chat
    if (memberIds.length > 0) {
      // Bulk insert all members in a single query
      const valuesClause = memberIds
        .map((_, i) => `($1, $${i + 2}, NOW(), NOW())`)
        .join(", ");
      const params = [chat.chatId, ...memberIds];
      await client.$executeRawUnsafe(
        `INSERT INTO "public"."chatmemberships" ("chatId", "userId", "createdAt", "updatedAt") VALUES ${valuesClause};`,
        ...params
      );
    }
    
    return chat;
  }

  /**
   * Create a DIRECT chat and add both users as members. If a DIRECT chat already exists, returns it.
   */
  static async createDirectChatWithMembers(userAId: string, userBId: string, tx?: TransactionClient) {
    const [minId, maxId] = [userAId, userBId].sort();
    const client = (tx || prismaClient) as TransactionClient;

    // check existing
    const existing = await this.findDirectChatBetween(minId, maxId, client);
    if (existing) return existing;

    // create chat
    if (tx) {
      const [created] = await client.$queryRaw<any[]>`
        INSERT INTO "public"."chats" ("chatId", "type", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'DIRECT', NOW(), NOW())
        RETURNING *;
      `;
      await client.$queryRaw`
        INSERT INTO "public"."chatmemberships" ("chatId", "userId", "createdAt", "updatedAt")
        VALUES (${created.chatId}, ${minId}, NOW(), NOW()), (${created.chatId}, ${maxId}, NOW(), NOW());
      `;
      return created;
    }

    const result = await prismaClient.$transaction(async (t) => {
      const [created] = await t.$queryRaw<any[]>`
        INSERT INTO "public"."chats" ("chatId", "type", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'DIRECT', NOW(), NOW())
        RETURNING *;
      `;
      await t.$queryRaw`
        INSERT INTO "public"."chatmemberships" ("chatId", "userId", "createdAt", "updatedAt")
        VALUES (${created.chatId}, ${minId}, NOW(), NOW()), (${created.chatId}, ${maxId}, NOW(), NOW());
      `;
      return created;
    });

    return result;
  }

  static async update(chatId: string, updates: { chatName?: string }, tx?: TransactionClient) {
    const client = (tx || prismaClient) as TransactionClient;

    // Whitelist columns that can be updated
    const setFragments: Prisma.Sql[] = [];
    if (updates.chatName !== undefined) {
      setFragments.push(Prisma.sql`"name" = ${updates.chatName}`);
    }

    if (setFragments.length === 0) return null;

    const [chat] = await client.$queryRaw<any[]>`
      UPDATE "public"."chats"
      SET ${Prisma.join(setFragments, ", ")}, "updatedAt" = NOW()
      WHERE "chatId" = ${chatId}
      RETURNING *;
    `;

    return chat;
  }

  static async getAllDirectChatsByUserId(userId: string, tx?: TransactionClient) {
    const client = (tx || prismaClient) as TransactionClient;
    return client.$queryRaw<any[]>`
      SELECT c.*, u."userId" as "otherUserId", u."username" as "otherUsername", u."name" as "otherName"
      FROM "public"."chats" c
      JOIN "public"."chatmemberships" cm ON cm."chatId" = c."chatId"
      JOIN "public"."users" u ON u."userId" = cm."userId"
      WHERE c."type" = 'DIRECT' AND cm."userId" != ${userId} AND EXISTS (
        SELECT 1 FROM "public"."chatmemberships" cm2
        WHERE cm2."chatId" = c."chatId" AND cm2."userId" = ${userId}
      )
      ORDER BY c."lastMessageAt" DESC NULLS LAST, c."updatedAt" DESC;
    `;
  }

  static async getAllGuildChatsByGuildId(guildId: string, tx?: TransactionClient) {
    const client = (tx || prismaClient) as TransactionClient;
    return client.$queryRaw<any[]>`
      SELECT c.*
      FROM "public"."chats" c
      WHERE c."guildId" = ${guildId}
      ORDER BY c."lastMessageAt" DESC NULLS LAST, c."updatedAt" DESC;
    `;
  }

  static async getAllMessagesByChatId(chatId: string, tx?: TransactionClient) {
    const client = (tx || prismaClient) as TransactionClient;
    return client.$queryRaw<any[]>`
      SELECT m.*, u."userId" as "senderId", u."username" as "senderUsername", u."name" as "senderName"
      FROM "public"."messages" m
      JOIN "public"."users" u ON m."senderId" = u."userId"
      WHERE m."chatId" = ${chatId}
      ORDER BY m."createdAt" ASC;
    `;
  }

  static async addMember(chatId: string, userId: string, tx?: TransactionClient) {
    const client = (tx || prismaClient) as TransactionClient;
    const [row] = await client.$queryRaw<any[]>`
      INSERT INTO "public"."chatmemberships" ("chatId", "userId", "createdAt", "updatedAt")
      VALUES (${chatId}, ${userId}, NOW(), NOW())
      RETURNING *;
    `;
    return row;
  }

  static async getMemberByUserIdAndChatId(userId: string, chatId: string, tx?: TransactionClient) {
    const client = (tx || prismaClient) as TransactionClient;
    const [row] = await client.$queryRaw<any[]>`
      SELECT * FROM "public"."chatmemberships"
      WHERE "chatId" = ${chatId} AND "userId" = ${userId}
      LIMIT 1;
    `;
    return row ?? null;
  }

  static async delete(chatId: string, tx?: TransactionClient) {
    const client = (tx || prismaClient) as TransactionClient;
    await client.$queryRaw`
      DELETE FROM "public"."chatmemberships" WHERE "chatId" = ${chatId};
    `;
    await client.$queryRaw`
      DELETE FROM "public"."chats" WHERE "chatId" = ${chatId};
    `;
  }
}

export default ChatDAO;
