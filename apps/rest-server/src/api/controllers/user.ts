import { Request, Response } from "express";
import { type User } from "@baatcheet/db"
import UserService from "../services/user.js";
import RequestError from "../errors/request-error.js";
import { ExceptionType } from "../errors/exceptions.js";
import UserFriendService from "../services/user-friend.js";
// import UserFriendService from "../services/user-friend";

class UserController {
  static async getAll(_req: Request, res: Response) {
    const users = await UserService.getAll();

    res.status(200).json({
      message: 'Users fetched successfully',
      count: users.length,
      users
    });
  }

//   static async verify(req: Request, res: Response) {
//     const { token } = req.params;

//     await UserService.verify(token);

//     res.status(200).json({ message: 'User verified successfully' });
//   }

  static async getById(req: Request, res: Response) {
    const userId = req.params.userId as string;

    const user = await UserService.findById(userId);

    if (!user)
      throw new RequestError(ExceptionType.NOT_FOUND);

    res.status(200).json({
      message: 'User fetched successfully',
      user: {
        userId: user.userId,
        name: user.name,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  }

  static async getByName(req: Request, res: Response) {
    const username = req.params.username as string;

    const user = await UserService.findByUsername(username);

    if (!user)
      throw new RequestError(ExceptionType.NOT_FOUND);

    res.status(200).json({
      message: 'User fetched successfully',
      user: {
        userId: user.userId,
        name: user.name,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  }

  static async create(req: Request, res: Response) {
    const { name, username, password } = req.body;

    if (!username || !name || !password)
      throw new RequestError(ExceptionType.BAD_REQUEST, 'Username, name and password are required');

    if (!(username as string).match(/^(?=.{3,20}$)[a-zA-Z][a-zA-Z0-9_]*$/))
      throw new RequestError(ExceptionType.BAD_REQUEST, 'Username must start with a letter, be 3-20 characters long, and only contain letters, numbers, or underscores');

    if (password.length < 8)
      throw new RequestError(ExceptionType.BAD_REQUEST, 'Password must be at least 8 characters long');

    const user = await UserService.create(
      name,
      username,
      password,
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        userId: user.userId,
        name: user.name,
        username: user.username,
        // role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });
  }

  static async login(req: Request, res: Response) {
    const { username, password } = req.body;

    if (!password || !(username))
      throw new RequestError(ExceptionType.BAD_REQUEST, 'Username is required');

    const { user, token } = await UserService.login({ username, password });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        userId: user.userId,
        name: user.name,
        username: user.username,
        // role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });
  }

  static async update(req: Request, res: Response) {
    const { userId } = req.params;
    const { name } = req.body;
    
    if (userId !== req.user!.userId)
      throw new RequestError(ExceptionType.FORBIDDEN, 'You are not allowed to update this user');

    await UserService.update(userId, { name });

    res.status(200).json({ message: 'User updated successfully' });
  }

  static async getFriends(req: Request, res: Response) {
    const friends = await UserFriendService.getUserFriends(req.user!.userId as string);

    res.status(200).json({
      message: 'Friends fetched successfully',
      friends
    });
  }

  static async getRequests(req: Request, res: Response) {
    const requests = await UserFriendService.getUserFriends(req.user!.userId as string, false);

    res.status(200).json({
      message: 'Friends requests successfully',
      requests
    });
  }

  static async addFriend(req: Request, res: Response) {
    const friendId = req.params.userId as string;
    const userId = req.user!.userId as string;

    if (userId === friendId)
      throw new RequestError(ExceptionType.BAD_REQUEST, "Cannot add yourself as friends");

    await UserFriendService.addFriend(userId, friendId);

    res.status(201).json({
      message: "User added as friend"
    });
  }

  static async removeFriend(req: Request, res: Response) {
    const friendId = req.params.userId as string;
    const userId = req.user!.userId as string;

    if (userId === friendId)
      throw new RequestError(ExceptionType.BAD_REQUEST, "Cannot remove yourself from friends");

    const result = await UserFriendService.removeFriend(userId, friendId);

    if (!result)
      throw new RequestError(ExceptionType.NOT_FOUND, "User is not a friend");

    res.status(200).json({
      message: "User removed from friends"
    });
  }
}

export default UserController;
