import { User, type UserFriend, PrismaClient, prismaClient } from "@baatcheet/db";
import { Creation } from "../types/utils";
import { randomUUID } from "crypto";

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

class UserFriendDAO {
  // Helper method to normalize user IDs (smaller userId first)
  private static normalizeUserIds(userId: string, friendId: string) {
    return userId < friendId 
      ? { userId, friendId } 
      : { userId: friendId, friendId: userId };
  }

  static async create({ userId, friendId }: Creation<UserFriend, "userfriendId">, tx?: TransactionClient) {
    const client = tx || prismaClient;
    const normalized = this.normalizeUserIds(userId, friendId);
    
    const [result] = await client.$queryRaw<UserFriend[]>`
      INSERT INTO "public"."userfriends" ("userfriendId", "userId", "friendId", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${normalized.userId}, ${normalized.friendId}, NOW(), NOW())
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
    return await client.$queryRaw<
      Array<Pick<User, "userId" | "username" | "name"> & Pick<UserFriend, "createdAt">>
    >`--sql
      SELECT 
        CASE 
          WHEN uf."userId" = ${userId} THEN u2."userId"
          ELSE u1."userId" 
        END as "userId",
        CASE 
          WHEN uf."userId" = ${userId} THEN u2."name"
          ELSE u1."name" 
        END as "name",
        CASE 
          WHEN uf."userId" = ${userId} THEN u2."username"
          ELSE u1."username" 
        END as "username",
        uf."createdAt"
      FROM "public"."userfriends" uf
      JOIN "public"."users" u1 ON uf."userId" = u1."userId"
      JOIN "public"."users" u2 ON uf."friendId" = u2."userId"
      WHERE uf."userId" = ${userId} OR uf."friendId" = ${userId}
    `;
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
