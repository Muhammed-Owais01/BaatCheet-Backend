import { prismaClient } from "@baatcheet/db";

export async function validateChatMembership(userId: string, chatId: string) {
  const membership = await prismaClient.chatMembership.findFirst({
    where: {
      userId,
      chatId,
    }
  });

  if (!membership) {
    throw new Error("User is not a member of this chat");
  }

  return membership;
}