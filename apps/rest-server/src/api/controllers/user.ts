import { Request, Response } from "express";
import { type User } from "@baatcheet/db"
import UserService from "../services/user.js";
import RequestError from "../errors/request-error.js";
import { ExceptionType } from "../errors/exceptions.js";
// import UserFriendService from "../services/user-friend";

class UserController {
  static async getAll(req: Request, res: Response) {
    // const userId = req.user!.id!;
    const users: User[] = await UserService.getAll();

    res.status(200).json({
      message: 'Users fetched successfully',
      count: users.length,
      users: await Promise.all(users.map(async (user: User) => ({
        id: user.userId,
        name: user.name,
        username: user.username,
        // role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // isMutualFriend: await UserFriendService.checkIfMutualFriend(userId, user.id)
      })))
    });
  }

//   static async verify(req: Request, res: Response) {
//     const { token } = req.params;

//     await UserService.verify(token);

//     res.status(200).json({ message: 'User verified successfully' });
//   }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id!;

    if (!id)
      throw new RequestError(ExceptionType.BAD_REQUEST);

    const user = await UserService.findById(id);

    if (!user)
      throw new RequestError(ExceptionType.NOT_FOUND);

    res.status(200).json({
      message: 'User fetched successfully',
      user: {
        id: user.userId,
        name: user.name,
        username: user.username,
        // role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // isMutualFriend: await UserFriendService.checkIfMutualFriend(userId, user.id),
        // isFriend: await UserFriendService.getIsFriend(userId, user.id)
      }
    });
  }

  static async getByName(req: Request, res: Response) {
    const { username } = req.params;
    // const userId = req.user!.id!;

    if (!username)
      throw new RequestError(ExceptionType.BAD_REQUEST);

    const user = await UserService.findByUsername(username);

    if (!user)
      throw new RequestError(ExceptionType.NOT_FOUND);

    res.status(200).json({
      message: 'User fetched successfully',
      user: {
        id: user.userId,
        name: user.name,
        username: user.username,
        // role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // isMutualFriend: await UserFriendService.checkIfMutualFriend(userId, user.id)
      }
    });
  }

  static async create(req: Request, res: Response) {
    const { name, username, password } = req.body;

    if (!username || !name || !password)
      throw new RequestError(ExceptionType.BAD_REQUEST, 'Username, name and password are required');

    if (password.length < 8)
      throw new RequestError(ExceptionType.BAD_REQUEST, 'Password must be at least 8 characters long');

    // const role = key === process.env.ADMIN_KEY ? 'admin' : 'member';
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

//   static async register(req: Request, res: Response) {
//     const { username, displayName, email, password, key } = req.body;

//     if (!username || !email || !password)
//       throw new RequestError(ExceptionType.BAD_REQUEST, 'Username, email and password are required');

//     if (password.length < 8)
//       throw new RequestError(ExceptionType.BAD_REQUEST, 'Password must be at least 8 characters long');

//     const role = key === process.env.ADMIN_KEY ? 'admin' : 'member';
//     const user = await UserService.create(
//       email.split('@')[0],
//       username,
//       email,
//       password,
//       role
//     );

//     res.status(201).json({
//       message: 'User registered successfully. Please check your email to verify your account.',
//       user: {
//         id: user.id,
//         username: user.username,
//         displayName: user.displayName,
//         role,
//         createdAt: user.createdAt,
//         updatedAt: user.updatedAt
//       }
//     });
//   }

  static async login(req: Request, res: Response) {
    const { username, password } = req.body;

    if (!password || !(username))
      throw new RequestError(ExceptionType.BAD_REQUEST, 'Username is required');

    const { user, token } = await UserService.login({ username, password });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.userId,
        name: user.name,
        username: user.username,
        // role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    });
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { username, password } = req.body;
    
    // const numId = parseInt(id);
    if (id !== req.user!.id)
      throw new RequestError(ExceptionType.FORBIDDEN, 'You are not allowed to update this user');

    await UserService.update(id, { username, password });

    res.status(200).json({ message: 'User updated successfully' });
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    // const numId = parseInt(id);
    if (req.user!.role !== id)
      throw new RequestError(ExceptionType.FORBIDDEN, 'You are not allowed to delete this user');

    await UserService.delete(id);

    res.status(200).json({ message: 'User deleted successfully' });
  }

//   static async findUserComments(req: Request, res: Response) {
//     const userId = req.user!.id!;

//     const comments = await CommentService.findByUserId(userId);
//     res.status(200).json({ message: "Comments fetched successfully", comments });
//   }

//   static async getJoinedCommunities(req: Request, res: Response) {
//     const communities = await CommunityMemberService.getCommunities(req.user!.id as number);

//     res.status(200).json({
//       message: 'Joined communities fetched successfully',
//       communities: await Promise.all(communities.map(async membership => ({
//         id: membership.community!.id,
//         name: membership.community!.name,
//         description: membership.community!.description,
//         tags: membership.community!.tags,
//         memberCount: (await CommunityMemberService.getMembers(membership.community!.id)).length,
//         joined: membership.joined
//       })))
//     });
//   }
//   static async addFriend(req: Request, res: Response) {
//     const { id } = req.params;
//     const numId = parseInt(id);

//     if (numId === req.user!.id)
//       throw new RequestError(ExceptionType.BAD_REQUEST, 'You cannot add yourself as a friend');

//     await UserFriendService.addFriend(req.user!.id as number, numId);

//     res.status(201).json({ message: 'Friend added successfully' });
//   }

//   static async removeFriend(req: Request, res: Response) {
//     const { id } = req.params;
//     const numId = parseInt(id);
    
//     if (numId === req.user!.id)
//       throw new RequestError(ExceptionType.BAD_REQUEST);

//     await UserFriendService.removeFriend(req.user!.id as number, numId);

//     res.status(200).json({ message: 'Friend removed successfully' });
//   }

//   static async getFriends(req: Request, res: Response) {
//     const friends = await UserFriendService.getFriends(req.user!.id as number);

//     res.status(200).json({
//       message: 'Friends fetched successfully',
//       friends: await Promise.all(friends.map(async (friend: User) => ({
//         id: friend.id,
//         username: friend.username,
//         displayName: friend.displayName,
//         role: friend.role,
//         createdAt: friend.createdAt,
//         updatedAt: friend.updatedAt,
//         isMutualFriend: await UserFriendService.checkIfMutualFriend(req.user!.id as number, friend.id)
//       })))
//     });
//   }
}

export default UserController;