import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import env from '@baatcheet/env';

import userRouter from './api/routes/user.js';
import chatRouter from './api/routes/chat.js';
import guildRouter from './api/routes/guild.js';

import errorHandler from './api/utils/error-handler.js';

const app = express();

app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const corsOrigin = env.CORS_ORIGIN;
if (!corsOrigin) {
  throw new Error('CORS_ORIGIN environment variable must be set for security reasons.');
}
app.use(cors({
  origin: corsOrigin,
}));

app.use('/users', userRouter);
app.use('/chats', chatRouter);
app.use('/guilds', guildRouter);

app.use(errorHandler);

export default app;
