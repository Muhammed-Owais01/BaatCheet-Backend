import { PrismaClient, prismaClient, type Guild } from "@baatcheet/db";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class GuildDAO {
    static async create(guildName: string, ownerId: string, tx?: TransactionClient): Promise<Guild> {
        const client = tx ?? prismaClient;
        const [guild] = await client.$queryRaw<Guild[]>`
            INSERT INTO "guilds" ("guildId", "guildName", "ownerId", "createdAt", "updatedAt")
            VALUES (${randomUUID()}, ${guildName}, ${ownerId}, NOW(), NOW())
            RETURNING *;
        `;
        return guild;
    }

    static async findById(guildId: string): Promise<Guild | null> {
        const [guild] = await prismaClient.$queryRaw<Guild[]>`
            SELECT * FROM "guilds" WHERE "guildId" = ${guildId} LIMIT 1;
        `;
        return guild ?? null;
    }

    static async findByNameAndOwnerId(guildName: string, ownerId: string): Promise<Guild | null> {
        const [guild] = await prismaClient.$queryRaw<Guild[]>`
            SELECT * FROM "guilds" WHERE "guildName" = ${guildName} AND "ownerId" = ${ownerId} LIMIT 1;
        `;
        return guild ?? null;
    }

    static async findAll(): Promise<Guild[]> {
        return prismaClient.$queryRaw<Guild[]>`
            SELECT * FROM "guilds" ORDER BY "createdAt" DESC;
        `;
    }

    static async update(guildId: string, data: Partial<Omit<Guild, "guildId" | "createdAt" | "updatedAt">>, tx?: TransactionClient): Promise<Guild | null> {
        const client = tx ?? prismaClient;

        // Whitelist columns that can be updated
        const setFragments: Prisma.Sql[] = [];

        if (data.guildName !== undefined) {
            setFragments.push(Prisma.sql`"guildName" = ${data.guildName}`);
        }
        if (data.ownerId !== undefined) {
            setFragments.push(Prisma.sql`"ownerId" = ${data.ownerId}`);
        }

        if (setFragments.length === 0) return null;

        const [guild] = await client.$queryRaw<Guild[]>`
            UPDATE "guilds"
            SET ${Prisma.join(setFragments, ", ")}
            WHERE "guildId" = ${guildId}
            RETURNING *;
        `;
        return guild ?? null;
    }

    static async delete(guildId: string, tx?: TransactionClient): Promise<void> {
        const client = tx ?? prismaClient;
        await client.$queryRaw`
            DELETE FROM "guilds" WHERE "guildId" = ${guildId};
        `;
    }
}

export default GuildDAO;