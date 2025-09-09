import winston from 'winston';
import path from 'path';
import fs from 'fs';

const MAX_FILE_SIZE = 5242880; // 5MB
const MAX_FILES = 5;

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: MAX_FILE_SIZE,
      maxFiles: MAX_FILES,
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: MAX_FILE_SIZE,
      maxFiles: MAX_FILES,
    }),
  ],
});

export default logger; 