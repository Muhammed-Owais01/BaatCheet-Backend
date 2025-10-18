import { Router } from 'express';
import asyncHandler from '../utils/async-handler.js';
import UserController from '../controllers/user.js';
import authHandler from '../middlewares/auth-handler.js';

const router: Router = Router();

router.get('/', asyncHandler(UserController.getAll));
router.get('/id/:userId', asyncHandler(UserController.getById));
router.get('/username/:username', asyncHandler(UserController.getByName));

router.post('/', asyncHandler(UserController.create));
router.post('/login', asyncHandler(UserController.login));

router.get('/friends', authHandler, asyncHandler(UserController.getFriends));
router.post('/friends/requests/:userId', authHandler, asyncHandler(UserController.sendFriendRequest));
router.post('/friends/requests/:userId/accept', authHandler, asyncHandler(UserController.acceptFriendRequest));
router.post('/friends/requests/:userId/reject', authHandler, asyncHandler(UserController.rejectFriendRequest));
router.get('/friends/requests', authHandler, asyncHandler(UserController.getRequests));
router.delete('/friends/:userId', authHandler, asyncHandler(UserController.removeFriend));

export default router;