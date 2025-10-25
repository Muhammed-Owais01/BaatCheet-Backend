import { Router } from 'express';
import GuildController from '../controllers/guild.js';
import authHandler from '../middlewares/auth-handler.js';
import asyncHandler from '../utils/async-handler.js';

const router = Router();

router.post('/', authHandler, asyncHandler(GuildController.createGuild));
router.post('/:guildId/roles', authHandler, asyncHandler(GuildController.createRole));
router.post('/:guildId/members/:memberId/assign', authHandler, asyncHandler(GuildController.assignRoleToMember));
router.get('/', authHandler, asyncHandler(GuildController.getAllGuilds));
router.get('/:guildId', authHandler, asyncHandler(GuildController.getGuildById));
router.patch('/:guildId', authHandler, asyncHandler(GuildController.updateGuild));
router.post('/:guildId/members', authHandler, asyncHandler(GuildController.addMemberToGuild));
router.delete('/:guildId/members/:memberId', authHandler, asyncHandler(GuildController.removeMemberFromGuild));
router.delete('/:guildId/roles', authHandler, asyncHandler(GuildController.deleteRole));
router.delete('/:guildId', authHandler, asyncHandler(GuildController.deleteGuild));

export default router;