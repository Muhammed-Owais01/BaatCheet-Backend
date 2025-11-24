import { Router } from 'express';
import asyncHandler from '../utils/async-handler.js';
import ChatController from '../controllers/chat.js';
import authHandler from '../middlewares/auth-handler.js';

const router: Router = Router();

router.get('/dms', authHandler, asyncHandler(ChatController.getAllDMChatsByUserId));
router.get('/:chatId', authHandler, asyncHandler(ChatController.getChatById));
router.get('/guild/:guildId', authHandler, asyncHandler(ChatController.getAllGuildChatsByGuildId));
router.get('/:chatId/messages', authHandler, asyncHandler(ChatController.getAllMessagesByChatId));

export default router;
