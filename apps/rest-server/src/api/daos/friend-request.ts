import { Request, PrismaClient } from "@baatcheet/db";
import { Creation } from "../types/utils";
import { prismaClient } from "@baatcheet/db";

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

class RequestDAO {
  static async create({ requesterId, receiverId }: Creation<Request, never>, tx?: TransactionClient) {
    const client = tx || prismaClient;
    const [result] = await client.$queryRaw<Request[]>`
      INSERT INTO "public"."requests" ("createdAt", "updatedAt", "requesterId", "receiverId")
      VALUES (NOW(), NOW(), ${requesterId}, ${receiverId})
      RETURNING *;
    `;
    return result;
  }

  static async getByReceiverId(receiverId: string, tx?: TransactionClient) {
    const client = tx || prismaClient;
    return await client.$queryRaw<Request[]>`
      SELECT u."userId", u."username", u."name", r."createdAt"
      FROM "public"."requests" r
      JOIN "public"."users" u ON "requesterId" = u."userId"
      WHERE "receiverId" = ${receiverId}
      ORDER BY "createdAt" DESC
    `;
  }

  static async findRequest(requesterId: string, receiverId: string, tx?: TransactionClient) {
    const client = tx || prismaClient;
    const [result] = await client.$queryRaw<Request[]>`
      SELECT * FROM "public"."requests"
      WHERE "requesterId" = ${requesterId} AND "receiverId" = ${receiverId}
    `;
    return result ?? null;
  }

  static async remove(requesterId: string, receiverId: string, tx?: TransactionClient) {
    const client = tx || prismaClient;
    const [result] = await client.$queryRaw<Request[]>`
      DELETE FROM "public"."requests"
      WHERE "requesterId" = ${requesterId} AND "receiverId" = ${receiverId}
      RETURNING *;
    `;
    return result ?? null;
  }
}

export default RequestDAO;
