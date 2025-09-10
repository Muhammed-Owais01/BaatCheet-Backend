import { NextFunction, Request, Response } from 'express';
import asyncHandler from '../utils/async-handler.js';
import jwt from 'jsonwebtoken';
import UserDAO from '../daos/user.js';
import RequestError from '../errors/request-error.js';
import { ExceptionType } from '../errors/exceptions.js';
import { type UserPayload } from '../types/express.d';

const authHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) throw new RequestError(ExceptionType.INVALID_TOKEN);

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_KEY || 'secret-key'
    ) as UserPayload;

    const user = await UserDAO.findById(decoded.id);
    req.user = { ...decoded };
    next();
  } catch (error: unknown) {
    throw new RequestError(ExceptionType.AUTH_FAILURE);
  }
});

export default authHandler;