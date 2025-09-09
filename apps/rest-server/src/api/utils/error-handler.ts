import { NextFunction, Request, Response } from "express";
import dotenv from 'dotenv';
import RequestError from "../errors/request-error.js";
import logger from "../../logs/logger";
dotenv.config();

const errorHandler = (error: Error | RequestError, req: Request, res: Response, next: NextFunction) => {
  let error_status: number;
  let error_name: string;
  let error_message: string;
  let error_info: string | undefined;

  if (error instanceof RequestError) {
    error_status = error.status || 500;
    error_name = error.name;
    error_message = error.message;
    error_info = error.info;
  } else {
    error_status = 500;
    error_name = 'Server Error';
    error_message = 'Internal Server Error';
    error_info = undefined;
  }

  logger.error(JSON.stringify(error) + (error.stack ? '\n' + error.stack : ''));
  res.status(error_status).json({
    success: false,
    error: {
      name: error_name,
      message: error_message,
      info: error_info,
      stack: process.env.MODE === 'dev' && error.stack
    }
  });
};

export default errorHandler;