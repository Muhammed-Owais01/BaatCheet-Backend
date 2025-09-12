import { User, type UserFriend, prismaClient } from "@baatcheet/db";
import { Creation } from "../types/utils";
import { randomUUID } from "crypto";

class UserFriendDAO {
  static async create({ userId, friendId }: Creation<UserFriend, "userfriendId">) {
    const [result] = await prismaClient.$queryRaw<UserFriend[]>`
      INSERT INTO "public"."userfriends" ("userfriendId", "userId", "friendId", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${userId}, ${friendId}, NOW(), NOW())
      RETURNING *;
    `;
    return result;
  }

  static async getMutualFriendsByUserId(userId: string) {
    return await prismaClient.$queryRaw<
      Array<Pick<User, "userId" | "username" | "name"> & Pick<UserFriend, "createdAt">>
    >`--sql
      SELECT u."userId", u."name", u."username", uf1."createdAt"
      FROM "public"."userfriends" uf1
      JOIN "public"."users" u ON uf1."friendId" = u."userId"
      JOIN "public"."userfriends" uf2
      ON uf1."userId" = uf2."friendId" AND uf2."userId" = uf1."friendId"
      WHERE uf1."userId" = ${userId}
    `;
  }

  static async getNotMutualFriendsByUserId(userId: string) {
    return await prismaClient.$queryRaw<
      Array<Pick<User, "userId" | "username" | "name"> & Pick<UserFriend, "createdAt">>
    >`--sql
      SELECT u."userId", u."name", u."username", uf1."createdAt"
      FROM "public"."userfriends" uf1
      JOIN "public"."users" u ON uf1."friendId" = u."userId"
      WHERE uf1."userId" = ${userId}
        AND NOT EXISTS (
          SELECT 1
          FROM "public"."userfriends" uf2
          WHERE uf1."userId" = uf2."friendId" AND uf2."userId" = uf1."friendId"
        );
    `
  }

  static async delete({ userId, friendId }: Pick<UserFriend, "userId" | "friendId">) {
    const [result] = await prismaClient.$queryRaw<UserFriend[]>`
      DELETE FROM "public"."userfriends"
      WHERE "userId" = ${userId} AND "friendId" = ${friendId}
      RETURNING *;
    `;
    return result ?? null;
  }
}

export default UserFriendDAO;
