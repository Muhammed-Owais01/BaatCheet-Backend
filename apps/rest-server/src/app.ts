import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import userRouter from './api/routes/user.js';
// import communityRouter from './api/routes/community';
// import postRouter from './api/routes/post';
// import commentRouter from './api/routes/comment';

import errorHandler from './api/utils/error-handler.js';

const app = express();

app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cors());

app.use('/users', userRouter);
// app.use('/community', communityRouter);
// app.use('/post', postRouter);
// app.use('/comment', commentRouter);

app.use(errorHandler);

export default app;
