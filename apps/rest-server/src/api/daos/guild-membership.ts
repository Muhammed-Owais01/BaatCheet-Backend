import { prismaClient, type GuildMembership } from "@baatcheet/db";
import { randomUUID } from "crypto";

export class GuildMembershipDAO {    
    static async create(guildId: string, userId: string, roleId: string): Promise<GuildMembership> {
        const [membership] = await prismaClient.$queryRaw<GuildMembership[]>`
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
        const memberships = await prismaClient.$queryRaw<string[]>`
            SELECT roleId FROM "guildmemberships" WHERE "guildId" = ${guildId} AND "userId" = ${memberId};
        `;
        return memberships.length > 0 ? memberships : null;
    }

    static async updateRole(membershipId: string, roleId: string): Promise<GuildMembership | null> {
        const [updatedMembership] = await prismaClient.$queryRaw<GuildMembership[]>`
            UPDATE "guildmemberships" SET "roleId" = ${roleId} WHERE "id" = ${membershipId} RETURNING *;
        `;
        return updatedMembership || null;
    }

    static async delete(guildId: string, userId: string): Promise<void> {
        await prismaClient.$queryRaw`
            DELETE FROM "guildmemberships" WHERE "guildId" = ${guildId} AND "userId" = ${userId};
        `;
    }

    static async deleteByGuildId(guildId: string): Promise<void> {
        await prismaClient.$queryRaw`
            DELETE FROM "guildmemberships" WHERE "guildId" = ${guildId};
        `;
    }
}

export default GuildMembershipDAO;