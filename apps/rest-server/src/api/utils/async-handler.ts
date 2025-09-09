import { type NextFunction, type Request, type Response, type RequestHandler } from "express";

const asyncHandler = (callback: RequestHandler) => (req: Request, res: Response, next: NextFunction): Promise<void> => 
  Promise.resolve(callback(req, res, next)).catch((error: unknown) => next(error)) as Promise<void>;

export default asyncHandler;
