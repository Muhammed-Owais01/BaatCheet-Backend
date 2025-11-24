import { Request, Response } from "express";
import ChatService from "../services/chat.js";

class ChatController {
  static async getChatById(req: Request, res: Response) {
    const { chatId } = req.params;
    const userId = req.user!.userId;

    const chat = await ChatService.getChatById(userId, chatId);

    res.status(200).json({
      success: true,
      message: 'Chat fetched successfully',
      chat
    });
  }

  static async getAllDMChatsByUserId(req: Request, res: Response) {
    const userId = req.user!.userId;
    const chats = await ChatService.getAllDMChatsByUserId(userId);

    res.status(200).json({
      success: true,
      message: 'DM chats fetched successfully',
      chats
    });
  }

  static async getAllGuildChatsByGuildId(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { guildId } = req.params;
    const chats = await ChatService.getAllGuildChatsByGuildId(userId, guildId);

    res.status(200).json({
      success: true,
      message: 'Guild chats fetched successfully',
      chats
    });
  }

  static async getAllMessagesByChatId(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { chatId, guildId } = req.params;

    const messages = await ChatService.getAllMessagesByChatId(userId, chatId);

    res.status(200).json({
      success: true,
      message: 'Messages fetched successfully',
      messages
    });
  }
}

export default ChatController;