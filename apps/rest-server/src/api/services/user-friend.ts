import { Prisma } from "@baatcheet/db";
import UserFriendDAO from "../daos/user-friend.js";
import { ExceptionType } from "../errors/exceptions.js";
import RequestError from "../errors/request-error.js";

class UserFriendService {
  static async getUserFriends(userId: string) {
    return await UserFriendDAO.getMutualFriendsByUserId(userId);
  }

  static async addFriend(userId: string, friendId: string) {
    try {
      return await UserFriendDAO.create({ userId, friendId });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.meta?.code === "23505" // psql unique constraint error
      ) {
        throw new RequestError(ExceptionType.CONFLICT);
      }

      throw error;
    }
  }

  static async removeFriend(userId: string, friendId: string) {
    return await UserFriendDAO.delete({ userId, friendId });
  }
}

export default UserFriendService;
