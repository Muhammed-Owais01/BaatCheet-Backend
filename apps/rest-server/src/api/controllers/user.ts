import { Request, Response } from "express";
import { type User } from "@baatcheet/db"
import UserService from "../services/user.js";
import RequestError from "../errors/request-error.js";
import { ExceptionType } from "../errors/exceptions.js";
import UserFriendService from "../services/friends.js";
// import UserFriendService from "../services/user-friend";

class UserController {
  static async getAll(_req: Request, res: Response) {
    const users = await UserService.getAll();

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      count: users.length,
      users
    });
  }

  static async getById(req: Request, res: Response) {
    const userId = req.params.userId as string;

    const user = await UserService.findById(userId);

    if (!user)
      throw new RequestError(ExceptionType.NOT_FOUND);

    res.status(200).json({
      success: true,
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
      success: true,
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
      success: true,
      message: 'User created successfully',
      user: {
        userId: user.userId,
        name: user.name,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });
  }

  static async login(req: Request, res: Response) {
    const { username, password } = req.body;

    if (!password || !username)
      throw new RequestError(ExceptionType.BAD_REQUEST, 'Username and password are required');

    const { user, token } = await UserService.login({ username, password });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        userId: user.userId,
        name: user.name,
        username: user.username,
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
      success: true,
      message: 'Friends fetched successfully',
      friends
    });
  }

  static async sendFriendRequest(req: Request, res: Response) {
    const receiverId = req.params.userId as string;
    const requesterId = req.user!.userId as string;
    if (receiverId === requesterId) {
      throw new RequestError(ExceptionType.BAD_REQUEST, 'You cannot send a friend request to yourself');
    }
    await UserFriendService.sendFriendRequest(requesterId, receiverId);
    res.status(200).json({
      success: true,
      message: 'Friend request sent successfully',
    });
  }

  static async getRequests(req: Request, res: Response) {
    const requests = await UserFriendService.getFriendRequests(req.user!.userId as string);
    res.status(200).json({
      success: true,
      message: 'Friend requests fetched successfully',
      requests
    });
  }

  static async acceptFriendRequest(req: Request, res: Response) {
    const requesterId = req.params.userId as string;
    const receiverId = req.user!.userId as string;
    if (receiverId === requesterId) {
      throw new RequestError(ExceptionType.BAD_REQUEST, 'You cannot accept a friend request from yourself');
    }
    await UserFriendService.acceptFriendRequest(requesterId, receiverId);
    res.status(200).json({
      success: true,
      message: 'Friend request accepted successfully',
    });
  }

  static async rejectFriendRequest(req: Request, res: Response) {
    const requesterId = req.params.userId as string;
    const receiverId = req.user!.userId as string;
    if (receiverId === requesterId) {
      throw new RequestError(ExceptionType.BAD_REQUEST, 'You cannot reject a friend request from yourself');
    }

    await UserFriendService.rejectFriendRequest(requesterId, receiverId);
    res.status(200).json({
      success: true,
      message: 'Friend request rejected successfully',
    });
  }

  static async removeFriend(req: Request, res: Response) {
    const friendId = req.params.userId as string;
    const userId = req.user!.userId as string;

    if (friendId === userId)
      throw new RequestError(ExceptionType.BAD_REQUEST, 'You cannot remove yourself as a friend');

    await UserFriendService.removeFriend(userId, friendId);

    res.status(200).json({
      success: true,
      message: 'Friend removed successfully'
    });
  }
}

export default UserController;
