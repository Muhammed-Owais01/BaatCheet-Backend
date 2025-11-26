import { Request, Response } from 'express';
import GuildService from '../services/guild.js';
import RequestError from '../errors/request-error.js';
import { ExceptionType } from '../errors/exceptions.js';

class GuildController {
  static async createGuild(req: Request, res: Response) {
    try {
      const { guildName } = req.body;
      const ownerId = req.user!.userId;

      if (!guildName || typeof guildName !== 'string' || guildName.trim().length === 0) {
        throw new RequestError(ExceptionType.BAD_REQUEST, 'Guild name is required and must be a non-empty string');
      }

      const guild = await GuildService.createGuild(guildName.trim(), ownerId);
      return res.status(201).json({
        success: true,
        message: 'Guild created successfully',
        guildId: guild.guildId
      });
    } catch (err: any) {
      if (err?.message?.includes('already exists')) {
        throw new RequestError(ExceptionType.CONFLICT, 'Guild with this name already exists');
      }
      throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to create guild');
    }
  }

  static async createGuildChat(req: Request, res: Response) {
    const { guildId } = req.params;
    const { chatName } = req.body;
    const userId = req.user!.userId;

    const chat = await GuildService.createGuildChat(guildId, chatName, userId);

    return res.status(201).json({
      success: true,
      message: 'Guild chat created successfully',
      chat
    });
  }

  static async joinGuild(req: Request, res: Response) {
    const { guildId } = req.params;
    const userId = req.user!.userId;
    const guild = await GuildService.joinGuild(guildId, userId);

    return res.status(200).json({
      success: true,
      message: 'Joined guild successfully',
      guildId: guild.guildId
    });
  }

  static async leaveGuild(req: Request, res: Response) {
    const { guildId } = req.params;
    const userId = req.user!.userId;
    await GuildService.leaveGuild(guildId, userId);

    return res.status(200).json({
      success: true,
      message: 'Left guild successfully'
    });
  }

  static async getPermissionsInGuild(req: Request, res: Response) {
    const { guildId } = req.params;
    const userId = req.user!.userId;
    const permissions = await GuildService.getPermissionsInGuildByMemberId(guildId, userId, userId);

    return res.status(200).json({
      success: true,
      message: 'Permissions fetched successfully',
      permissions
    });
  }

  static async getRolesInGuildByMemberId(req: Request, res: Response) {
    const { guildId, memberId } = req.params;
    const userId = req.user!.userId;
    const roles = await GuildService.getRolesInGuildByMemberId(guildId, userId, memberId);

    return res.status(200).json({
      success: true,
      message: 'Roles fetched successfully',
      roles
    });
  }

  static async getRolesInGuild(req: Request, res: Response) {
    const { guildId } = req.params;
    const userId = req.user!.userId;
    const roles = await GuildService.getRolesInGuild(guildId, userId);

    return res.status(200).json({
      success: true,
      message: 'Roles fetched successfully.',
      roles
    });
  }

  static async createRole(req: Request, res: Response) {
    const { guildId } = req.params;
    const { roleName, permissions, color } = req.body;
    const userId = req.user!.userId;

    const role = await GuildService.createRole(guildId, roleName, userId, permissions, color);

    return res.status(201).json({
      success: true,
      message: 'Role created successfully',
      role
    });
  }

  static async getGuildById(req: Request, res: Response) {
    const { guildId } = req.params;
    const userId = req.user!.userId;
    const guild = await GuildService.getGuildById(guildId, userId);

    if (!guild) {
      throw new RequestError(ExceptionType.NOT_FOUND, 'Guild not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Guild fetched successfully',
      guild
    });
  }

  static async getAllGuilds(_req: Request, res: Response) {
    const guilds = await GuildService.getAllGuilds();
    return res.status(200).json({
      success: true,
      message: 'Guilds fetched successfully',
      guilds
    });
  }

  static async getAllGuildsByUserId(req: Request, res: Response) {
    const userId = req.user!.userId;
    const guilds = await GuildService.getAllGuildsByUserId(userId);
    return res.status(200).json({
      success: true,
      message: 'Guilds fetched successfully',
      guilds
    });
  }

  static async getAllMembersByGuildId(req: Request, res: Response) {
    const { guildId } = req.params;
    const userId = req.user!.userId;

    const members = await GuildService.getAllMembersByGuildId(guildId, userId);

    return res.status(200).json({
      success: true,
      message: 'Members fetched successfully',
      members
    });
  }

  static async addMemberToGuild(req: Request, res: Response) {
    const { guildId, memberId } = req.params;
    const userId = req.user!.userId;

    await GuildService.addMemberToGuild(guildId, userId, memberId);

    return res.status(200).json({
      success: true,
      message: 'Member added to guild successfully'
    });

  }

  static async assignRoleToMember(req: Request, res: Response) {
    const { guildId, memberId, roleId } = req.params;
    const userId = req.user!.userId;

    const role = await GuildService.assignRoleToMember(guildId, roleId, userId, memberId);

    return res.status(200).json({
      success: true,
      message: 'Role assigned to member successfully',
      role
    });
  }

  static async changeOwner(req: Request, res: Response) {
    const { guildId, newOwnerId } = req.params;
    const currentOwnerId = req.user!.userId;

    await GuildService.changeOwner(guildId, currentOwnerId, newOwnerId);

    return res.status(200).json({
      success: true,
      message: 'Guild ownership transferred successfully'
    });
  }

  static async updateGuildChat(req: Request, res: Response) {
    const { guildId, chatId } = req.params;
    const { chatName } = req.body;
    const userId = req.user!.userId;

    const updatedChat = await GuildService.updateGuildChat(guildId, chatId, chatName, userId);

    return res.status(200).json({
      success: true,
      message: 'Guild chat updated successfully',
      chat: updatedChat
    });
  }

  static async updateGuild(req: Request, res: Response) {
    try {
      const { guildId } = req.params;
      const { guildName } = req.body as { guildName?: string };

      const updateData: Partial<{ guildName: string }> = {};
      if (typeof guildName === 'string' && guildName.trim().length > 0) {
        updateData.guildName = guildName.trim();
      }

      if (Object.keys(updateData).length === 0) {
        throw new RequestError(ExceptionType.BAD_REQUEST, 'No valid fields to update');
      }

      const updated = await GuildService.updateGuild(guildId, updateData as any);

      if (!updated) {
        throw new RequestError(ExceptionType.NOT_FOUND, 'Guild not found');
      }

      return res.status(200).json({
        success: true,
        message: 'Guild updated successfully',
        guild: updated
      });
    } catch {
      throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to update guild');
    }
  }

  static async deleteGuildChat(req: Request, res: Response) {
    const { guildId, chatId } = req.params;
    const userId = req.user!.userId;

    await GuildService.deleteGuildChat(guildId, chatId, userId);

    return res.status(200).json({
      success: true,
      message: 'Guild chat deleted successfully'
    });
  }

  static async removeRoleFromMember(req: Request, res: Response) {
    const { guildId, memberId, roleId } = req.params;
    const userId = req.user!.userId;

    await GuildService.removeRoleFromMember(guildId, roleId, userId, memberId);

    return res.status(200).json({
      success: true,
      message: 'Role removed from member successfully'
    });
  }

  static async removeMemberFromGuild(req: Request, res: Response) {
    const { guildId, memberId } = req.params;
    const userId = req.user!.userId;

    await GuildService.removeMemberFromGuild(guildId, userId, memberId);

    return res.status(200).json({
      success: true,
      message: 'Member removed from guild successfully'
    });
  }

  static async deleteRole(req: Request, res: Response) {
    const { guildId } = req.params;
    const { roleName } = req.body;
    const userId = req.user!.userId;

    await GuildService.deleteRole(guildId, roleName, userId);

    return res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });
  }

  static async deleteGuild(req: Request, res: Response) {
    const { guildId } = req.params;
    const userId = req.user!.userId;
    
    await GuildService.deleteGuild(guildId, userId);

    return res.status(200).json({
      success: true,
      message: 'Guild deleted successfully'
    });
  }
}

export default GuildController;