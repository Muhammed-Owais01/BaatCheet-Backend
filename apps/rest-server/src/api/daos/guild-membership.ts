import { PrismaClient, prismaClient, type GuildMembership } from "@baatcheet/db";
import { randomUUID } from "crypto";

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class GuildMembershipDAO {    
    static async create(guildId: string, userId: string, roleId: string, tx?: TransactionClient): Promise<GuildMembership> {
        const client = tx ?? prismaClient;
        const [membership] = await client.$queryRaw<GuildMembership[]>`
            INSERT INTO "guildmemberships" ("guildId", "userId", "roleId", "createdAt", "updatedAt")
            VALUES (${guildId}, ${userId}, ${roleId}, NOW(), NOW())
            RETURNING *
        `;
        return membership;
    }

    static async findAllGuildByUserId(userId: string): Promise<GuildMembership[]> {
        return prismaClient.$queryRaw<GuildMembership[]>`
            SELECT * FROM "guildmemberships" WHERE "userId" = ${userId} ORDER BY "createdAt" DESC;
        `;
    }

    static async findAllMembersByGuildId(guildId: string): Promise<GuildMembership[]> {
        return prismaClient.$queryRaw<GuildMembership[]>`
            SELECT * FROM "guildmemberships" WHERE "guildId" = ${guildId} ORDER BY "createdAt" DESC;
        `;
    }

    static async findByGuildIdAndMemberId(guildId: string, memberId: string): Promise<string[] | null> {
        const memberships = await prismaClient.$queryRaw<Array<{ roleId: string }>>`
            SELECT roleId FROM "guildmemberships" WHERE "guildId" = ${guildId} AND "userId" = ${memberId};
        `;
        const roleIds = memberships.map(m => m.roleId);
        return roleIds.length > 0 ? roleIds : null;
    }

    static async updateRole(membershipId: string, roleId: string, tx?: TransactionClient): Promise<GuildMembership | null> {
        const client = tx ?? prismaClient;
        const [updatedMembership] = await client.$queryRaw<GuildMembership[]>`
            UPDATE "guildmemberships" SET "roleId" = ${roleId} WHERE "id" = ${membershipId} RETURNING *;
        `;
        return updatedMembership || null;
    }

    static async delete(guildId: string, userId: string, tx?: TransactionClient): Promise<void> {
        const client = tx ?? prismaClient;
        await client.$queryRaw`
            DELETE FROM "guildmemberships" WHERE "guildId" = ${guildId} AND "userId" = ${userId};
        `;
    }

    static async deleteByGuildId(guildId: string, tx?: TransactionClient): Promise<void> {
        const client = tx ?? prismaClient;
        await client.$queryRaw`
            DELETE FROM "guildmemberships" WHERE "guildId" = ${guildId};
        `;
    }
}

export default GuildMembershipDAO;