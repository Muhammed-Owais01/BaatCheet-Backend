import { Router } from 'express';
import asyncHandler from '../utils/async-handler.js';
import UserController from '../controllers/user.js';
import authHandler from '../middlewares/auth-handler.js';
// import { authLimiter } from '../middlewares/rate-limiter';

const router: Router = Router();

router.get('/', authHandler, asyncHandler(UserController.getAll));
router.get('/id/:id', authHandler, asyncHandler(UserController.getById));
router.get('/username/:username', authHandler, asyncHandler(UserController.getByName));

// router.get('/verify/:token', asyncHandler(UserController.verify));

router.post('/', asyncHandler(UserController.create));

// router.post('/register', /* authLimiter, */ asyncHandler(UserController.register));
router.post('/login', /* authLimiter, */ asyncHandler(UserController.login));

router.patch('/:id', authHandler, asyncHandler(UserController.update));
router.delete('/:id', authHandler, asyncHandler(UserController.delete));

// router.post('/friends/:id', authHandler, asyncHandler(UserController.addFriend));
// router.delete('/friends/:id', authHandler, asyncHandler(UserController.removeFriend));

// router.get('/friends', authHandler, asyncHandler(UserController.getFriends));
// router.get('/communities', authHandler, asyncHandler(UserController.getJoinedCommunities));
// router.get('/comments', authHandler, asyncHandler(UserController.findUserComments));

export default router;