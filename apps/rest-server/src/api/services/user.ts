import UserDAO from "../daos/user.js";
import { type User } from "@baatcheet/db";
import { ExceptionType } from "../errors/exceptions.js";
import RequestError from "../errors/request-error.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import env from "@baatcheet/env";

class UserService {
  static async getAll() {
    return await UserDAO.findAll();
  }

  static async findById(id: string) {
    return await UserDAO.findById(id);
  }

  static async findByUsername(username: string) {
    return await UserDAO.findByUsername(username);
  }

  static async create(name: string, username: string, password: string) {
    let existingUser = await UserService.findByUsername(username);

    if (existingUser)
      throw new RequestError(ExceptionType.CONFLICT);

    let user: User = await UserDAO.create({ name, username, password });

    if (!user)
      throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to create user');

    return user;
  }

  static async update(id: string, user: Partial<Omit<User, "userId" | "createdAt" | "updatedAt">>) {
    if (!await UserDAO.findById(id))
      throw new RequestError(ExceptionType.NOT_FOUND);

    return await UserDAO.update(id, user);
  }

  static async delete(id: string) {
    if (! await UserDAO.findById(id))
      throw new RequestError(ExceptionType.NOT_FOUND);

    return await UserDAO.delete(id);
  }

  static async login(credentials: { username: string, password: string }) {
    const user = await UserDAO.findByUsername(credentials.username);

    if (!user)
      throw new RequestError(ExceptionType.AUTH_FAILURE, 'Invalid email or password');

    const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password);

    if (!isPasswordValid)
      throw new RequestError(ExceptionType.AUTH_FAILURE, 'Invalid email or password');

    const token = jwt.sign(
      {
        userId: user.userId,
        username: user.username,
      },
      env.JWT_KEY as string,
      {
        expiresIn: env.MODE === 'dev' ? '1yr' : '1d'
      }
    );

    return { user, token };
  }
}

export default UserService;