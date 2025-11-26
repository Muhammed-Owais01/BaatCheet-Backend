import { PrismaClient, prismaClient, type GuildBan } from "@baatcheet/db";

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class GuildBanDAO {
  static async create(guildId: string, userId: string, tx?: TransactionClient): Promise<GuildBan> {
    const client = tx ?? prismaClient;
    const [ban] = await client.$queryRaw<GuildBan[]>`
        INSERT INTO "guildbans" ("guildId", "userId", "createdAt", "updatedAt")
        VALUES (${guildId}, ${userId}, NOW(), NOW())
        RETURNING *
    `;
    return ban;
  }

  static async findByGuildIdAndUserId(guildId: string, userId: string): Promise<GuildBan | null> {
    const [ban] = await prismaClient.$queryRaw<GuildBan[]>`
        SELECT * FROM "guildbans" WHERE "guildId" = ${guildId} AND "userId" = ${userId} LIMIT 1;
    `;
    return ban ?? null;
  }

  static async findAllByGuildId(guildId: string): Promise<GuildBan[]> {
    return prismaClient.$queryRaw<GuildBan[]>`
        SELECT gb.*, u."username", u."name" FROM "guildbans" gb
        JOIN "public"."users" u ON gb."userId" = u."userId"
        WHERE gb."guildId" = ${guildId}
        ORDER BY gb."createdAt" DESC;
    `;
  }

  static async delete(guildId: string, userId: string, tx?: TransactionClient): Promise<void> {
    const client = tx ?? prismaClient;
    await client.$queryRaw`
        DELETE FROM "guildbans" WHERE "guildId" = ${guildId} AND "userId" = ${userId};
    `;
  }
}

export default GuildBanDAO;
