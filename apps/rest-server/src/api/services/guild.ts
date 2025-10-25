import GuildDAO from "../daos/guild.js";
import { prismaClient, type Guild } from "@baatcheet/db";
import GuildMembershipDAO from "../daos/guild-membership.js";
import GuildRolesDAO from "../daos/guild-roles.js";
import RequestError from "../errors/request-error.js";
import { ExceptionType } from "../errors/exceptions.js";
import { fgaClient } from "@baatcheet/auth";

export class GuildService {
    static async createGuild(guildName: string, ownerId: string) {
        const guild: Guild | null = await GuildDAO.findByNameAndOwnerId(guildName, ownerId);
        if (guild) {
            throw new RequestError(ExceptionType.CONFLICT, 'You already own a guild with this name');
        }

        return await prismaClient.$transaction(async (tx) => {
            try {
                const newGuild = await GuildDAO.create(guildName, ownerId, tx);
                const role = await GuildRolesDAO.create(newGuild.guildId, 'Member', 'white', tx);
                let membership = await GuildMembershipDAO.create(newGuild.guildId, ownerId, role.roleId, tx);

                await fgaClient.write({
                    writes: [{
                        user: `user:${ownerId}`,
                        relation: "owner",
                        object: `guild:${newGuild.guildId}`,
                    },{
                        user: `user:${ownerId}`,
                        relation: "member",
                        object: `guild:${newGuild.guildId}`,
                    }]
                });

                return newGuild
            } catch (error) {
                console.error('Error creating guild:', error);
                throw error;
            }
        });
    }

    static async getGuildById(guildId: string) {
        return GuildDAO.findById(guildId);
    }

    static async getAllGuilds() {
        return GuildDAO.findAll();
    }

    static async createRole(guildId: string, roleName: string, userId: string, permissions: string[], color?: string) {
        const canCreateRole = await fgaClient.check({
            user: `user:${userId}`,
            relation: "can_manage_roles",
            object: `guild:${guildId}`
        });
        if (!canCreateRole.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You do not have permission to create roles in this guild');
        }

        return await prismaClient.$transaction(async (tx) => {
            try {
                const role = await GuildRolesDAO.create(guildId, roleName, color, tx);
                
                await fgaClient.write({
                    writes: [{
                        user: `guild:${guildId}`,
                        relation: "parent",
                        object: `role:${role.roleId}`
                    }]
                });
        
                await fgaClient.write({
                    writes: permissions.map(permission => ({
                        user: `role:${role.roleId}#has_role`,
                        relation: permission,
                        object: `guild:${guildId}`
                    }))
                })

                return role;
            } catch (error) {
                console.error('Error creating role:', error);
                throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to create role');
            }
        })
    }

    static async assignRoleToMember(guildId: string, roleName: string, userId: string, memberId: string) {
        const canAssignRole = await fgaClient.check({
            user: `user:${userId}`,
            relation: "can_manage_roles",
            object: `guild:${guildId}`
        });
        if (!canAssignRole.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You do not have permission to assign roles in this guild');
        }

        const membership = await GuildMembershipDAO.findByGuildIdAndMemberId(guildId, memberId);
        if (!membership) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Guild membership not found for the member');
        }

        const roleId = await GuildRolesDAO.getRoleIdByGuildIdAndRoleName(guildId, roleName);
        if (!roleId) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Role not found in the guild');
        }

        return await prismaClient.$transaction(async (tx) => {
            try {
                const membership = await GuildMembershipDAO.create(guildId, memberId, roleId, tx);

                await fgaClient.write({
                    writes: [{
                        user: `user:${memberId}`,
                        relation: "has_role",
                        object: `role:${roleId}`
                    }]
                });

                return membership;
            } catch (error) {
                console.error('Error assigning role to member:', error);
                throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to assign role to member');
            }
        });

    }

    static async updateGuild(guildId: string, data: Partial<Omit<Guild, "guildId" | "createdAt" | "updatedAt">>) {
        const guild = this.getGuildById(guildId);
        if (!guild) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Guild not found');
        }
        
        return GuildDAO.update(guildId, data);
    }

    static async addMemberToGuild(guildId: string, userId: string, memberId: string) {
        const canAddMember = await fgaClient.check({
            user: `user:${userId}`,
            relation: "can_add_members",
            object: `guild:${guildId}`
        });
        if (!canAddMember.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You do not have permission to add members to this guild');
        }

        const guild = await this.getGuildById(guildId);
        if (!guild) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Guild not found');
        }

        const roleId = await GuildRolesDAO.getRoleIdByGuildIdAndRoleName(guildId, 'Member');
        if (!roleId) {
            throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Default role not found for guild');
        }

        await prismaClient.$transaction(async (tx) => {
            try {
                await GuildMembershipDAO.create(guildId, memberId, roleId, tx);

                await fgaClient.write({
                    writes: [{
                        user: `user:${memberId}`,
                        relation: "member",
                        object: `guild:${guildId}`
                    }]
                });

            } catch (error) {
                console.error('Error adding member to guild:', error);
                throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to add member to guild');
            }
        })

    }

    static async removeMemberFromGuild(guildId: string, userId: string, memberId: string) {
        const canRemoveMember = await fgaClient.check({
            user: `user:${userId}`,
            relation: "can_kick_members",
            object: `guild:${guildId}`
        });
        if (!canRemoveMember.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You do not have permission to remove members from this guild');
        }

        const guild = await this.getGuildById(guildId);
        if (!guild) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Guild not found');
        }
        
        if (memberId === guild.ownerId) {
            throw new RequestError(ExceptionType.BAD_REQUEST, 'Cannot remove the owner from the guild');
        }

        const roleIds = await GuildMembershipDAO.findByGuildIdAndMemberId(guildId, memberId);
        if (!roleIds) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Guild membership not found for the member');
        }

        await prismaClient.$transaction(async (tx) => {
            try {
                await GuildMembershipDAO.delete(guildId, memberId);

                if (roleIds?.length) {
                    await fgaClient.write({
                        deletes: roleIds.map(roleId => ({
                            user: `user:${memberId}`,
                            relation: "has_role",
                            object: `role:${roleId}`
                        }))
                    });
                }
            } catch (error) {
                console.error('Error removing member from guild:', error);
                throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to remove member from guild');
            }
        })
    }

    static async deleteRole(guildId: string, roleName: string, userId: string) {
        const canDeleteRole = await fgaClient.check({
            user: `user:${userId}`,
            relation: "can_manage_roles",
            object: `guild:${guildId}`
        });
        if (!canDeleteRole.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You do not have permission to delete roles in this guild');
        }

        const roleId = await GuildRolesDAO.getRoleIdByGuildIdAndRoleName(guildId, roleName);
        if (!roleId) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Role not found in the guild');
        }

        await prismaClient.$transaction(async (tx) => {
            try {
                await GuildRolesDAO.deleteByRoleId(roleId, tx);

                const { tuples: roleTuples } = await fgaClient.read({
                    object: `role:${roleId}`
                });
        
                if (roleTuples?.length) {
                    await fgaClient.write({
                        deletes: roleTuples.map(tuple => ({
                            object: tuple.key.object,
                            relation: tuple.key.relation,
                            user: tuple.key.user
                        }))
                    });
                }

            } catch (error) {
                console.error('Error deleting role:', error);
                throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to delete role');
            }
        });


    }

    static async deleteGuild(guildId: string, userId: string) {
        const guild = await this.getGuildById(guildId);
        if (!guild) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Guild not found');
        }

        const isOwner = await fgaClient.check({
            user: `user:${userId}`,
            relation: "owner",
            object: `guild:${guildId}`
        });
        if (!isOwner.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'Only the guild owner can delete the guild');
        }

        const roleIds = await GuildRolesDAO.getRoleIdsByGuildId(guildId);

        await prismaClient.$transaction(async (tx) => {
            try {
                await GuildDAO.delete(guildId, tx);
        
                for (const roleId of roleIds) {
                    const { tuples: roleTuples } = await fgaClient.read({
                        object: `role:${roleId}`
                    });
                    
                    if (roleTuples?.length) {
                        await fgaClient.write({
                            deletes: roleTuples.map(tuple => ({
                                object: tuple.key.object,
                                relation: tuple.key.relation,
                                user: tuple.key.user
                            }))
                        });
                    }
                }
        
                const { tuples: guildTuples } = await fgaClient.read({
                    object: `guild:${guildId}`
                });
        
                if (guildTuples?.length) {
                    await fgaClient.write({
                        deletes: guildTuples.map(tuple => ({
                            object: tuple.key.object,
                            relation: tuple.key.relation,
                            user: tuple.key.user
                        }))
                    });
                }
            } catch (error) {
                console.error('Error deleting guild:', error);
                throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to delete guild');
            }
        });

    }
}
export default GuildService;