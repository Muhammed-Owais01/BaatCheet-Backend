import { NextFunction, Request, Response } from 'express';
import asyncHandler from '../utils/async-handler.js';
import jwt from 'jsonwebtoken';
import RequestError from '../errors/request-error.js';
import { ExceptionType } from '../errors/exceptions.js';
import { type UserPayload } from '../types/express.d';
import env from '@baatcheet/env';

const authHandler = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) throw new RequestError(ExceptionType.INVALID_TOKEN);

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(
      token,
      env.JWT_KEY || 'secret-key'
    ) as UserPayload;

    req.user = decoded;
    next();
  } catch (error: unknown) {
    throw new RequestError(ExceptionType.AUTH_FAILURE);
  }
});

export default authHandler;