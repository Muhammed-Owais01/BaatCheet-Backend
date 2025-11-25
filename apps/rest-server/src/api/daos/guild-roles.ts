import { prismaClient, type GuildRole } from "@baatcheet/db";
import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class GuildRolesDAO {
    static async create(guildId: string, roleName: string, color?: string, tx?: TransactionClient): Promise<GuildRole> {
        const client = tx ?? prismaClient;
        const [role] = await client.$queryRaw<GuildRole[]>`
            INSERT INTO "guildroles" ("roleId", "guildId", "roleName", "color", "createdAt", "updatedAt")
            VALUES (${randomUUID()}, ${guildId}, ${roleName}, ${color}, NOW(), NOW())
            RETURNING *;
        `;
        return role;
    }

    static async findById(roleId: string): Promise<GuildRole | null> {
        const [role] = await prismaClient.$queryRaw<GuildRole[]>`
            SELECT * FROM "guildroles" WHERE "roleId" = ${roleId} LIMIT 1;
        `;
        return role ?? null;
    }

    static async getRoleNameByRoleIdAndGuildId(
        guildId: string,
        roleIds: string[]
    ): Promise<{ roleId: string; roleName: string }[]> {
        if (!roleIds?.length) return [];
        const rows = await prismaClient.$queryRaw<{ roleId: string; roleName: string }[]>`
            SELECT "roleId", "roleName"
            FROM "guildroles"
            WHERE "guildId" = ${guildId}
              AND "roleId" IN (${Prisma.join(roleIds)})
        `;
        return rows;
    }

    static async findByGuildIdAndRoleName(guildId: string, roleName: string): Promise<GuildRole | null> {
        const [role] = await prismaClient.$queryRaw<GuildRole[]>`
            SELECT * FROM "guildroles" WHERE "guildId" = ${guildId} AND "roleName" = ${roleName} LIMIT 1;
        `;
        return role ?? null;
    }

    static async findUniqueRolesByGuildId(guildId: string): Promise<Array<{ roleId: string; roleName: string; color: string }>> {
        return prismaClient.$queryRaw<Array<{ roleId: string; roleName: string; color: string }>>`
            SELECT DISTINCT r."roleId", r."roleName", r."color"
            FROM "public"."guildroles" r
            WHERE r."guildId" = ${guildId}
        `;
    }

    static async getRoleIdByGuildIdAndRoleName(guildId: string, roleName: string): Promise<string | null> {
        const [role] = await prismaClient.$queryRaw<GuildRole[]>`
            SELECT * FROM "guildroles" WHERE "guildId" = ${guildId} AND "roleName" = ${roleName} LIMIT 1;
        `;
        return role ? role.roleId : null;
    }

    static async getRoleIdsByGuildId(guildId: string): Promise<string[]> {
        const roles = await prismaClient.$queryRaw<GuildRole[]>`
            SELECT * FROM "guildroles" WHERE "guildId" = ${guildId} AND "roleName" != 'Member';
        `;
        return roles.map(role => role.roleId);
    }

    static async deleteByRoleId(roleId: string, tx?: TransactionClient): Promise<void> {
        const client = tx ?? prismaClient;
        await client.$queryRaw`
            DELETE FROM "guildroles" WHERE "roleId" = ${roleId};
        `;
    }

    static async deleteByGuild(guildId: string, tx?: TransactionClient): Promise<void> {
        const client = tx ?? prismaClient;
        await client.$queryRaw`
            DELETE FROM "guildroles" WHERE "guildId" = ${guildId};
        `;
    }
}

export default GuildRolesDAO;