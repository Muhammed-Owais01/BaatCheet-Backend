import { prismaClient, type Guild } from "@baatcheet/db";
import { randomUUID } from "crypto";

export class GuildDAO {
    static async create(guildName: string, ownerId: string): Promise<Guild> {
        const [guild] = await prismaClient.$queryRaw<Guild[]>`
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

    static async update(guildId: string, data: Partial<Omit<Guild, "guildId" | "createdAt" | "updatedAt">>): Promise<Guild | null> {
        const sets: string[] = [];
        const values: any[] = [];    

        for (const [key, value] of Object.entries(data)) {
            sets.push(`"${key}" = $${values.length + 1}`);
            values.push(value);
        }

        if (sets.length === 0) return null;

        const [guild] = await prismaClient.$queryRaw<Guild[]>`
            UPDATE "guilds" SET ${sets.join(", ")} WHERE "guildId" = ${guildId} RETURNING *;
        `;
        return guild ?? null;
    }

    static async delete(guildId: string): Promise<void> {
        await prismaClient.$queryRaw`
            DELETE FROM "guilds" WHERE "guildId" = ${guildId};
        `;
    }
}

export default GuildDAO;