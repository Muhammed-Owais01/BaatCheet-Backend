import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import userRouter from './api/routes/user.js';
import chatRouter from './api/routes/chat.js';

import errorHandler from './api/utils/error-handler.js';

const app = express();

app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cors());

app.use('/users', userRouter);
app.use('/chats', chatRouter);

app.use(errorHandler);

export default app;
