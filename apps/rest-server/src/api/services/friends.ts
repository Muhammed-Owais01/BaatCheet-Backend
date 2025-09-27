import { Prisma, prismaClient } from "@baatcheet/db";
import UserFriendDAO from "../daos/user-friend.js";
import { ExceptionType } from "../errors/exceptions.js";
import RequestError from "../errors/request-error.js";
import RequestDAO from "../daos/friend-request.js";

class UserFriendService {
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
    return await prismaClient.$transaction(async tx => {
      const existingFriend = await UserFriendDAO.findFriendship(requesterId, receiverId, tx);
      if (existingFriend)
        throw new RequestError(ExceptionType.CONFLICT, 'You are already friends with this user');

      try {
        const inverseExistingRequest = await RequestDAO.findRequest(receiverId, requesterId, tx);
        if (inverseExistingRequest)
          throw new RequestError(ExceptionType.CONFLICT, 'This user has already sent you a friend request');

        await RequestDAO.create({ requesterId, receiverId }, tx);
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError
          && error.meta?.code === "23505"
        ) {
          throw new RequestError(ExceptionType.CONFLICT, 'You have already sent a friend request to this user');
        }
        throw error;
      }
    });
  }

  static async acceptFriendRequest(requesterId: string, receiverId: string) {
    return await prismaClient.$transaction(async (tx) => {
      try {
        const pendingRequest = await RequestDAO.findRequest(requesterId, receiverId, tx);
        if (!pendingRequest)
          throw new RequestError(ExceptionType.NOT_FOUND, 'No pending friend request found from this user');

        await UserFriendDAO.create({ userId: requesterId, friendId: receiverId }, tx);
        await RequestDAO.remove(pendingRequest.requesterId, pendingRequest.receiverId, tx);
        
        return { success: true };
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError
          && error.meta?.code === "23505" // psql unique constraint error
        ) {
          throw new RequestError(ExceptionType.CONFLICT, 'You are already friends with this user');
        }
        throw error;
      }
    });
  }

  static async rejectFriendRequest(requesterId: string, receiverId: string) {
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
