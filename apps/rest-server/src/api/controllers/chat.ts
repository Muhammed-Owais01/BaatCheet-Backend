import { Request, Response } from "express";
import ChatService from "../services/chat.js";

class ChatController {
  static async getAllDMChatsByUserId(req: Request, res: Response) {
    const userId = req.user!.userId;
    const chats = await ChatService.getAllDMChatsByUserId(userId);

    res.status(200).json({
      success: true,
      message: 'DM chats fetched successfully',
      chats
    });
  }

  static async getAllMessagesByChatId(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { chatId } = req.params;

    const messages = await ChatService.getAllMessagesByChatId(userId, chatId);

    res.status(200).json({
      success: true,
      message: 'Messages fetched successfully',
      messages
    });
  }
}

export default ChatController;