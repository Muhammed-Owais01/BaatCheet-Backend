import { prismaClient, type GuildRole } from "@baatcheet/db";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

export class GuildRolesDAO {
    static async create(guildId: string, roleName: string, color?: string): Promise<GuildRole> {
        const [role] = await prismaClient.$queryRaw<GuildRole[]>`
            INSERT INTO "guildroles" ("roleId", "guildId", "roleName", "color", "createdAt", "updatedAt")
            VALUES (${randomUUID()}, ${guildId}, ${roleName}, ${color}, NOW(), NOW())
            RETURNING *;
        `;
        return role;
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

    static async deleteByRoleId(roleId: string): Promise<void> {
        await prismaClient.$queryRaw`
            DELETE FROM "guildroles" WHERE "roleId" = ${roleId};
        `;
    }

    static async deleteByGuild(guildId: string): Promise<void> {
        await prismaClient.$queryRaw`
            DELETE FROM "guildroles" WHERE "guildId" = ${guildId};
        `;
    }
}

export default GuildRolesDAO;