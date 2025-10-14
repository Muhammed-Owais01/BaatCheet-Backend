import ChatDAO from "../daos/chat.js";
import { ExceptionType } from "../errors/exceptions.js";
import RequestError from "../errors/request-error.js";

class ChatService {
  static async getAllDMChatsByUserId(userId: string) {
    return await ChatDAO.getAllDirectChatsByUserId(userId);
  }

  static async getAllMessagesByChatId(userId: string, chatId: string) {
    const chatMembership = await ChatDAO.getMemberByUserIdAndChatId(userId, chatId);
    if (!chatMembership)
      throw new RequestError(ExceptionType.FORBIDDEN, 'User is not a member of this chat');
    
    return await ChatDAO.getAllMessagesByChatId(chatId);
  }
}

export default ChatService;
