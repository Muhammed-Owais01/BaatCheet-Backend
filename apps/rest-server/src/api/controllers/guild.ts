import { Request, Response } from 'express';
import GuildService from '../services/guild.js';

class GuildController {
  static async createGuild(req: Request, res: Response) {
    try {
      const { guildName } = req.body;
      const ownerId = req.user!.userId;

      if (!guildName || typeof guildName !== 'string' || guildName.trim().length === 0) {
        return res.status(400).json({ error: 'guildName is required' });
      }

      const guild = await GuildService.createGuild(guildName.trim(), ownerId);
      return res.status(201).json(guild);
    } catch (err: any) {
      if (err?.message?.includes('already exists')) {
        return res.status(409).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Failed to create guild' });
    }
  }

  static async createRole(req: Request, res: Response) {
    const { guildId } = req.params;
    const { roleName, permissions, color } = req.body;
    const userId = req.user!.userId;

    const role = await GuildService.createRole(guildId, roleName, userId, permissions, color);

    return res.status(201).json({ message: 'Role created successfully', role });
  }

  static async getGuildById(req: Request, res: Response) {
    try {
      const { guildId } = req.params;
      const guild = await GuildService.getGuildById(guildId);

      if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
      }

      return res.status(200).json(guild);
    } catch {
      return res.status(500).json({ error: 'Failed to fetch guild' });
    }
  }

  static async getAllGuilds(_req: Request, res: Response) {
    try {
      const guilds = await GuildService.getAllGuilds();
      return res.status(200).json(guilds);
    } catch {
      return res.status(500).json({ error: 'Failed to fetch guilds' });
    }
  }

  static async addMemberToGuild(req: Request, res: Response) {
    const { guildId } = req.params;
    const { memberId } = req.body;
    const userId = req.user!.userId;

    await GuildService.addMemberToGuild(guildId, userId, memberId);

    return res.status(200).json({ message: 'Member added to guild successfully' });

  }

  static async assignRoleToMember(req: Request, res: Response) {
    const { guildId, memberId } = req.params;
    const { roleName } = req.body;
    const userId = req.user!.userId;

    const role = await GuildService.assignRoleToMember(guildId, roleName, userId, memberId);

    return res.status(200).json({ message: 'Role assigned to member successfully', role });
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
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const updated = await GuildService.updateGuild(guildId, updateData as any);

      if (!updated) {
        return res.status(404).json({ error: 'Guild not found' });
      }

      return res.status(200).json(updated);
    } catch {
      return res.status(500).json({ error: 'Failed to update guild' });
    }
  }

  static async removeMemberFromGuild(req: Request, res: Response) {
    const { guildId, memberId } = req.params;
    const userId = req.user!.userId;

    await GuildService.removeMemberFromGuild(guildId, userId, memberId);

    return res.status(200).json({ message: 'Member removed from guild successfully' });
  }

  static async deleteRole(req: Request, res: Response) {
    const { guildId } = req.params;
    const { roleName } = req.body;
    const userId = req.user!.userId;

    await GuildService.deleteRole(guildId, roleName, userId);

    return res.status(200).json({ message: 'Role deleted successfully' });
  }

  static async deleteGuild(req: Request, res: Response) {
    const { guildId } = req.params;
    const userId = req.user!.userId;
    
    await GuildService.deleteGuild(guildId, userId);

    return res.status(200).json({ message: 'Guild deleted successfully' });
  }
}

export default GuildController;