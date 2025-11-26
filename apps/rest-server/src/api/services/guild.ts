import GuildDAO from "../daos/guild.js";
import { GuildMembership, prismaClient, type Guild } from "@baatcheet/db";
import GuildMembershipDAO from "../daos/guild-membership.js";
import GuildRolesDAO from "../daos/guild-roles.js";
import RequestError from "../errors/request-error.js";
import { ExceptionType } from "../errors/exceptions.js";
import { fgaClient } from "@baatcheet/auth";
import ChatDAO from "../daos/chat.js";
import { guildPermissions } from "../constants/guild-permissions.js";

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
                const ownerRole = await GuildRolesDAO.create(newGuild.guildId, 'Owner', 'black', tx);
                await GuildMembershipDAO.create(newGuild.guildId, ownerId, role.roleId, tx);
                await GuildMembershipDAO.create(newGuild.guildId, ownerId, ownerRole.roleId, tx);

                await fgaClient.write({
                    writes: [{
                        user: `user:${ownerId}`,
                        relation: "owner",
                        object: `guild:${newGuild.guildId}`,
                    }, {
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

    static async leaveGuild(guildId: string, memberId: string) {
        const guild = await GuildDAO.findById(guildId);
        if (!guild) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Guild not found');
        }

        if (memberId === guild.ownerId) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'Owner cannot leave the guild');
        }

        const guildMembership = await GuildMembershipDAO.findByGuildIdAndMemberId(guildId, memberId);
        if (!guildMembership) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'You are not a member of this guild');
        }

        await prismaClient.$transaction(async (tx) => {
            try {
                await GuildMembershipDAO.delete(guildId, memberId, tx);
                await fgaClient.write({
                    deletes: [{
                        user: `user:${memberId}`,
                        relation: "member",
                        object: `guild:${guildId}`
                    }]
                });
            } catch (error) {
                console.error('Error leaving guild:', error);
                throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to leave guild');
            }
        });
    }

    static async createGuildChat(guildId: string, chatName: string, userId: string) {
        const guildMembership = await GuildMembershipDAO.findByGuildIdAndMemberId(guildId, userId);
        if (!guildMembership) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You are not a member of this guild');
        }

        const canManageChannels = await fgaClient.check({
            user: `user:${userId}`,
            relation: "can_manage_channels",
            object: `guild:${guildId}`,
        });

        if (!canManageChannels.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You do not have permission to create channels in this guild');
        }

        const members = await GuildMembershipDAO.findAllMembersByGuildId(guildId);
        const memberIds = members.map((member: any) => member.userId);

        return await prismaClient.$transaction(async (tx) => {
            try {
                const chat = await ChatDAO.createGuildChatWithMembers(guildId, chatName, memberIds, tx);
                return chat;
            } catch (error) {
                console.error('Error creating guild chat:', error);
                throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to create guild chat');
            }
        });
    }

    static async joinGuild(guildId: string, memberId: string) {
        const guild = await GuildDAO.findById(guildId);
        if (!guild) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Guild not found');
        }

        const guildMembership = await GuildMembershipDAO.findByGuildIdAndMemberId(guildId, memberId);
        if (!!guildMembership) {
            throw new RequestError(ExceptionType.CONFLICT, 'You are already a member of this guild');
        }

        const roleId = await GuildRolesDAO.getRoleIdByGuildIdAndRoleName(guildId, 'Member');
        if (!roleId) {
            throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Default role not found for guild');
        }

        let newMembership: GuildMembership | undefined;
        await prismaClient.$transaction(async (tx) => {
            try {
                newMembership = await GuildMembershipDAO.create(guildId, memberId, roleId, tx);

                const guildChats = await ChatDAO.getAllGuildChatsByGuildId(guildId, tx);
                for (const chat of guildChats) {
                    await ChatDAO.addMember(chat.chatId, memberId, tx);
                }
                console.log(`Added user ${memberId} to ${guildChats.length} guild chats`);

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
        });

        return newMembership as GuildMembership;
    }

    static async getPermissionsInGuildByMemberId(guildId: string, userId: string, memberId: string) {
        const guildMembership = await GuildMembershipDAO.findByGuildIdAndMemberId(guildId, userId);
        if (!guildMembership) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You are not a member of this guild');
        }

        // Check if the member is the owner
        const isOwner = await fgaClient.check({
            user: `user:${memberId}`,
            relation: 'owner',
            object: `guild:${guildId}`,
        });

        if (isOwner.allowed) {
            return guildPermissions.map(permission => ({
                permission,
                allowed: true,
                grantedByRole: 'Owner'
            }));
        }

        const memberRoles = await GuildMembershipDAO.findRolesByGuildIdAndMemberId(guildId, memberId);
        if (!memberRoles) {
            throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'No roles exist for this member in this guild');
        }

        const permissionsResult = await Promise.all(
            guildPermissions.map(async (permission) => {
                const checkResult = await fgaClient.check({
                    user: `user:${memberId}`,
                    relation: permission,
                    object: `guild:${guildId}`,
                });

                if (!checkResult.allowed) {
                    return null;
                }

                // Try to find which role grants this permission
                let grantingRole = null;

                for (const roleEntry of memberRoles) {
                    const roleCheck = await fgaClient.check({
                        user: `role:${roleEntry.roleId}#has_role`,
                        relation: permission,
                        object: `guild:${guildId}`,
                    });
                    if (roleCheck.allowed) {
                        grantingRole = {
                            roleId: roleEntry.roleId,
                            roleName: (roleEntry as any).roleName
                        };
                        break;
                    }
                }

                return {
                    permission,
                    allowed: true,
                    grantedByRole: grantingRole
                };
            })
        );

        return permissionsResult.filter(p => p !== null);
    }

    static async getRolesInGuildByMemberId(guildId: string, userId: string, memberId: string) {
        const guildMembership = await GuildMembershipDAO.findByGuildIdAndMemberId(guildId, userId);
        if (!guildMembership) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You are not a member of this guild');
        }
        return await GuildMembershipDAO.findRolesByGuildIdAndMemberId(guildId, memberId);
    }

    static async getRolesInGuild(guildId: string, userId: string) {
        const guildMembership = await GuildMembershipDAO.findByGuildIdAndMemberId(guildId, userId);
        if (!guildMembership) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You are not a member of this guild');
        }

        return await GuildRolesDAO.findUniqueRolesByGuildId(guildId);
    }

    static async getGuildById(guildId: string, userId: string) {
        const guildMembership = await GuildMembershipDAO.findByGuildIdAndMemberId(guildId, userId);
        if (!guildMembership) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You are not a member of this guild');
        }

        return GuildDAO.findById(guildId);
    }

    static async getAllGuilds() {
        return GuildDAO.findAll();
    }

    static async getAllGuildsByUserId(userId: string) {
        const guilds = await GuildMembershipDAO.findAllGuildByUserId(userId);

        const detailedGuilds = await Promise.all(guilds.map(async (guildMembership) => {
            const guild = await GuildDAO.findById(guildMembership.guildId);
            return guild;
        }));

        return detailedGuilds.filter((guild): guild is Guild => guild !== null);
    }

    static async getAllMembersByGuildId(guildId: string, userId: string) {
        const guildMembership = await GuildMembershipDAO.findByGuildIdAndMemberId(guildId, userId);
        if (!guildMembership) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You are not a member of this guild');
        }

        return await GuildMembershipDAO.findAllMembersByGuildId(guildId);
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

        const role = await GuildRolesDAO.findByGuildIdAndRoleName(guildId, roleName);
        if (!!role) {
            throw new RequestError(ExceptionType.CONFLICT, 'Role with this name already exists in the guild');
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

    static async assignRoleToMember(guildId: string, roleId: string, userId: string, memberId: string) {
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

        const role = await GuildRolesDAO.findById(roleId);
        if (!role) {
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

    static async removeRoleFromMember(guildId: string, roleId: string, userId: string, memberId: string) {
        const canRemoveRole = await fgaClient.check({
            user: `user:${userId}`,
            relation: "can_manage_roles",
            object: `guild:${guildId}`
        });

        if (!canRemoveRole.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You do not have permission to remove roles in this guild');
        }

        const role = await GuildRolesDAO.findById(roleId);
        if (!role) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Role not found in the guild');
        }

        return await prismaClient.$transaction(async (tx) => {
            try {
                await GuildMembershipDAO.deleteRoleFromMember(guildId, memberId, roleId, tx);
                await fgaClient.write({
                    deletes: [{
                        user: `user:${memberId}`,
                        relation: "has_role",
                        object: `role:${roleId}`
                    }]
                });
            }
            catch (error) {
                console.error('Error removing role from member:', error);
                throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to remove role from member');
            }
        });
    }

    static async updateGuild(guildId: string, data: Partial<Omit<Guild, "guildId" | "createdAt" | "updatedAt">>) {
        const guild = await GuildDAO.findById(guildId);
        if (!guild) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Guild not found');
        }

        return GuildDAO.update(guildId, data);
    }

    static async updateGuildChat(guildId: string, chatId: string, chatName: string, userId: string) {
        const canManageChannels = await fgaClient.check({
            user: `user:${userId}`,
            relation: "can_manage_channels",
            object: `guild:${guildId}`
        });

        if (!canManageChannels.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You do not have permission to update channels in this guild');
        }

        const chat = await ChatDAO.findById(chatId);
        if (!chat || chat.guildId !== guildId) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Guild chat not found');
        }

        const updatedChat = await ChatDAO.update(chatId, { chatName });

        return updatedChat;
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

        const guild = await GuildDAO.findById(guildId);
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
        });
    }

    static async deleteGuildChat(guildId: string, chatId: string, userId: string) {
        const canDeleteChat = await fgaClient.check({
            user: `user:${userId}`,
            relation: "can_manage_channels",
            object: `guild:${guildId}`
        });

        if (!canDeleteChat.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You do not have permission to delete channels in this guild');
        }

        const chat = await ChatDAO.findById(chatId);
        if (!chat || chat.guildId !== guildId) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Guild chat not found');
        }

        await prismaClient.$transaction(async (tx) => {
            await ChatDAO.delete(chatId, tx);
        });
    }

    static async removeMemberFromGuild(guildId: string, userId: string, memberId: string) {
        if (userId === memberId) {
            throw new RequestError(ExceptionType.BAD_REQUEST, 'Use leave guild to remove yourself');
        }

        const canRemoveMember = await fgaClient.check({
            user: `user:${userId}`,
            relation: "can_kick_members",
            object: `guild:${guildId}`
        });
        if (!canRemoveMember.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You do not have permission to remove members from this guild');
        }

        const guild = await GuildDAO.findById(guildId);
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
                await GuildMembershipDAO.delete(guildId, memberId, tx);
            } catch (error) {
                console.error('Error removing member from guild:', error);
                throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to remove member from guild');
            }
        });

        // Delete FGA tuples after successful DB transaction
        try {
            const deletes: Array<{ user: string; relation: string; object: string }> = [];

            // Check if member relation exists by attempting to read it specifically
            try {
                const memberCheck = await fgaClient.read({
                    user: `user:${memberId}`,
                    relation: 'member',
                    object: `guild:${guildId}`
                });
                if (memberCheck.tuples && memberCheck.tuples.length > 0) {
                    deletes.push({
                        user: `user:${memberId}`,
                        relation: "member",
                        object: `guild:${guildId}`
                    });
                    console.log('Found member relation to delete');
                }
            } catch (e) {
                console.log('No member relation found');
            }

            // Check if has_role relations exist
            if (roleIds?.length) {
                for (const roleId of roleIds) {
                    try {
                        const roleCheck = await fgaClient.read({
                            user: `user:${memberId}`,
                            relation: 'has_role',
                            object: `role:${roleId}`
                        });
                        if (roleCheck.tuples && roleCheck.tuples.length > 0) {
                            deletes.push({
                                user: `user:${memberId}`,
                                relation: "has_role",
                                object: `role:${roleId}`
                            });
                            console.log(`Found has_role relation for ${roleId} to delete`);
                        }
                    } catch (e) {
                        console.log(`No has_role relation found for ${roleId}`);
                    }
                }
            }

            console.log(`Deleting ${deletes.length} tuples`);
            if (deletes.length > 0) {
                await fgaClient.write({ deletes });
                console.log('Successfully deleted FGA tuples');
            } else {
                console.warn(`No FGA tuples found to delete for user ${memberId} in guild ${guildId}`);
            }
        } catch (error) {
            console.error('Error removing FGA tuples:', error);
            throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to update permissions');
        }
    }

    static async updateRole(guildId: string, roleId: string, userId: string, data: Partial<{ roleName: string; permissions: string[]; color: string }>) {
        const canUpdateRole = await fgaClient.check({
            user: `user:${userId}`,
            relation: "can_manage_roles",
            object: `guild:${guildId}`
        });
        if (!canUpdateRole.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, 'You do not have permission to update roles in this guild');
        }

        const role = await GuildRolesDAO.findById(roleId);
        if (!role) {
            throw new RequestError(ExceptionType.NOT_FOUND, 'Role not found in the guild');
        }

        return await prismaClient.$transaction(async (tx) => {
            try {
                const updatedRole = await GuildRolesDAO.update(roleId, data, tx);
                if (data.permissions) {
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

                    await fgaClient.write({
                        writes: data.permissions.map(permission => ({
                            user: `role:${role.roleId}#has_role`,
                            relation: permission,
                            object: `guild:${guildId}`
                        }))
                    });
                }
                return updatedRole;
            } catch (error) {
                console.error('Error updating role:', error);
                throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to update role');
            }
        });
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
        const guild = await GuildDAO.findById(guildId);
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

    static async changeOwner(guildId: string, currentUserId: string, newOwnerId: string) {
        // permission: only a principal allowed can_change_owner (model: owner)
        const canChange = await fgaClient.check({
            user: `user:${currentUserId}`,
            relation: "can_change_owner",
            object: `guild:${guildId}`
        });
        if (!canChange.allowed) {
            throw new RequestError(ExceptionType.FORBIDDEN, "You do not have permission to change guild ownership");
        }

        const guild = await GuildDAO.findById(guildId);
        if (!guild) {
            throw new RequestError(ExceptionType.NOT_FOUND, "Guild not found");
        }

        // require the new owner to be a member
        const memberRoleIds = await GuildMembershipDAO.findByGuildIdAndMemberId(guildId, newOwnerId);
        if (!memberRoleIds) {
            throw new RequestError(ExceptionType.BAD_REQUEST, "New owner must be a member of the guild");
        }

        const ownerRoleId = await GuildRolesDAO.getRoleIdByGuildIdAndRoleName(guildId, "Owner");
        if (!ownerRoleId) {
            throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, "Owner role not found in guild");
        }

        // Update ownerId and owner role assignments
        const updated = await prismaClient.$transaction(async (tx) => {
            const updatedGuild = await GuildDAO.update(guildId, { ownerId: newOwnerId }, tx);
            await GuildMembershipDAO.deleteRoleFromMember(guildId, guild.ownerId, ownerRoleId, tx);
            await GuildMembershipDAO.create(guildId, newOwnerId, ownerRoleId, tx);

            if (!updatedGuild) throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, "Failed to update guild owner");
            return updatedGuild;
        });

        // Update OpenFGA tuples: remove old owner tuple, add new owner tuple
        try {
            await fgaClient.write({
                deletes: [{
                    user: `user:${guild.ownerId}`,
                    relation: "owner",
                    object: `guild:${guildId}`
                }],
                writes: [{
                    user: `user:${newOwnerId}`,
                    relation: "owner",
                    object: `guild:${guildId}`
                }]
            });
        } catch (err) {
            console.error("Failed to update OpenFGA owner tuples after DB owner update:", err);
            throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, "Failed to update ownership in permission store");
        }

        return updated;
    }
}
export default GuildService;