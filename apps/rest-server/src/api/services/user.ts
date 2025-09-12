import UserDAO from "../daos/user.js";
import { type User } from "@baatcheet/db";
import { ExceptionType } from "../errors/exceptions.js";
import RequestError from "../errors/request-error.js";
import bcrypt from 'bcrypt';
// import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import env from "@baatcheet/env";
// import { sendVerificationEmail } from "../utils/email";

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

//   static async verify(token: string) {
//     const user = await UserDAO.findByVerificationToken(token);

//     if (!user)
//       throw new RequestError(ExceptionType.NOT_FOUND);

//     if (user.isVerified)
//       throw new RequestError(ExceptionType.BAD_REQUEST, 'User already verified');

//     await UserDAO.update(user.id, {
//       username: user.username,
//       displayName: user.displayName,  
//       email: user.email,
//       password: user.password,
//       role: user.role,
//       isVerified: true,
//       verificationToken: null
//     });

//     return user;
//   }

  static async create(name: string, username: string, password: string) {
    let existingUser = await UserService.findByUsername(username);

    if (existingUser)
      throw new RequestError(ExceptionType.CONFLICT);

    let user: User = await UserDAO.create({ name, username, password });
    // if (role === 'member') {
    //   const verificationToken = crypto.randomBytes(32).toString('hex');
    //   // password gets hashed in the before create hook
    //   user = await UserDAO.create({ username, displayName, email, password, role, isVerified: false, verificationToken });
    // } else {
    //   user = await UserDAO.create({ username, displayName, email, password, role, isVerified: true });
    // }

    if (!user)
      throw new RequestError(ExceptionType.INTERNAL_SERVER_ERROR, 'Failed to create user');

    // if (role === 'member')
    //   await sendVerificationEmail(email, user.verificationToken as string);

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

  // password is always available
  static async login(credentials: { username: string, password: string }) {
    // const user = credentials.username ? await UserService.findByUsername(credentials.username as string) : await UserService.findByEmail(credentials.email as string);
    const user = await UserDAO.findByUsername(credentials.username);

    if (!user)
      throw new RequestError(ExceptionType.AUTH_FAILURE, 'Invalid email or password');

    const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password);

    if (!isPasswordValid)
      throw new RequestError(ExceptionType.AUTH_FAILURE, 'Invalid email or password');
    
    // if (!user.isVerified)
    //   throw new RequestError(ExceptionType.FORBIDDEN, 'User is not verified');

    const token = jwt.sign(
      {
        userId: user.userId,
        username: user.username,
        // email: user.email,
        // role: user.role,
        // isVerified: user.isVerified
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