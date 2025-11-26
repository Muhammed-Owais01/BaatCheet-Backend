import ChatDAO from "../daos/chat.js";
import GuildMembershipDAO from "../daos/guild-membership.js";
import { ExceptionType } from "../errors/exceptions.js";
import RequestError from "../errors/request-error.js";

class ChatService {
  static async getChatById(userId: string, chatId: string) {
    const chatMembership = await ChatDAO.getMemberByUserIdAndChatId(userId, chatId);
    if (!chatMembership)
      throw new RequestError(ExceptionType.FORBIDDEN, 'User is not a member of this chat');
    return await ChatDAO.findById(chatId);
  }

  static async getAllDMChatsByUserId(userId: string) {
    return await ChatDAO.getAllDirectChatsByUserId(userId);
  }

  static async getAllMessagesByChatId(userId: string, chatId: string) {
    const chatMembership = await ChatDAO.getMemberByUserIdAndChatId(userId, chatId);
    if (!chatMembership)
      throw new RequestError(ExceptionType.FORBIDDEN, 'User is not a member of this chat');
    
    return await ChatDAO.getAllMessagesByChatId(chatId);
  }

  static async getAllGuildChatsByGuildId(userId: string, guildId: string) {
    const guildMembership = await GuildMembershipDAO.findByGuildIdAndMemberId(guildId, userId);
    if (!guildMembership)
      throw new RequestError(ExceptionType.FORBIDDEN, 'User is not a member of this guild');

    // dont add some chats based on role permissions or memberships later on
    
    return await ChatDAO.getAllGuildChatsByGuildId(guildId);
  }

}

export default ChatService;
