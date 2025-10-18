import { Prisma, prismaClient } from "@baatcheet/db";
import UserFriendDAO from "../daos/user-friend.js";
import { ExceptionType } from "../errors/exceptions.js";
import RequestError from "../errors/request-error.js";
import RequestDAO from "../daos/friend-request.js";
import ChatDAO from "../daos/chat.js";
import UserDAO from "../daos/user.js";

class UserFriendService {
  private static async checkUser(requesterId: string, receiverId: string) {
    const requester = await UserDAO.findById(requesterId);
    const receiver = await UserDAO.findById(receiverId);

    const errors = [];
    if (!requester)
      errors.push('Requester user not found');
    if (!receiver)
      errors.push('Receiver user not found');

    if (errors.length > 0)
      throw new RequestError(ExceptionType.NOT_FOUND, errors.join(', '));
  }

  static async getUserFriends(userId: string) {
    return await UserFriendDAO.getMutualFriendsByUserId(userId);
  }

  static async removeFriend(userId: string, friendId: string) {
    const removedFriend = await UserFriendDAO.delete({ userId, friendId });
    if (!removedFriend)
      throw new RequestError(ExceptionType.NOT_FOUND, 'Friendship not found');
    return removedFriend;
  }

  static async sendFriendRequest(requesterId: string, receiverId: string) {
    await this.checkUser(requesterId, receiverId);

    const existingFriend = await UserFriendDAO.findFriendship(requesterId, receiverId);
    if (existingFriend)
      throw new RequestError(ExceptionType.CONFLICT, 'You are already friends with this user');

    try {
      const inverseExistingRequest = await RequestDAO.findRequest(receiverId, requesterId);
      if (inverseExistingRequest)
        throw new RequestError(ExceptionType.CONFLICT, 'This user has already sent you a friend request');

      await RequestDAO.create({ requesterId, receiverId });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.meta?.code === "23505"
      ) {
        throw new RequestError(ExceptionType.CONFLICT, 'You have already sent a friend request to this user');
      }
      throw error;
    }
  }

  static async acceptFriendRequest(requesterId: string, receiverId: string) {
    await this.checkUser(requesterId, receiverId);

    const pendingRequest = await RequestDAO.findRequest(requesterId, receiverId);
    if (!pendingRequest)
      throw new RequestError(ExceptionType.NOT_FOUND, 'No pending friend request found from this user');

    return await prismaClient.$transaction(async (tx) => {
      try {
        await UserFriendDAO.create({ userId: requesterId, friendId: receiverId }, tx);
        await RequestDAO.remove(pendingRequest.requesterId, pendingRequest.receiverId, tx);

        await ChatDAO.createDirectChatWithMembers(requesterId, receiverId, tx);

        return { success: true };
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError
          && error.code === "P2002" // Prisma unique constraint error
        ) {
          if (error.meta?.constraint === "userfriends_userid_friendid_key") {
            throw new RequestError(ExceptionType.CONFLICT, 'You are already friends with this user');
          }
        }
        throw error;
      }
    });
  }

  static async rejectFriendRequest(requesterId: string, receiverId: string) {
    await this.checkUser(requesterId, receiverId);

    const pendingRequest = await RequestDAO.findRequest(requesterId, receiverId);
    if (!pendingRequest)
      throw new RequestError(ExceptionType.NOT_FOUND, 'No pending friend request found from this user');
    await RequestDAO.remove(pendingRequest.requesterId, pendingRequest.receiverId);
  }

  static async getFriendRequests(userId: string) {
    return await RequestDAO.getByReceiverId(userId);
  }
}

export default UserFriendService;
