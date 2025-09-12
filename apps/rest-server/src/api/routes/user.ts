import { Router } from 'express';
import asyncHandler from '../utils/async-handler.js';
import UserController from '../controllers/user.js';
import authHandler from '../middlewares/auth-handler.js';

const router: Router = Router();

router.get('/', asyncHandler(UserController.getAll));
router.get('/id/:userId', asyncHandler(UserController.getById));
router.get('/username/:username', asyncHandler(UserController.getByName));

// router.get('/verify/:token', asyncHandler(UserController.verify));

router.post('/', asyncHandler(UserController.create));
router.post('/login', asyncHandler(UserController.login));

// router.patch('/:userId', authHandler, asyncHandler(UserController.update));

router.get('/friends', authHandler, asyncHandler(UserController.getFriends));
router.post('/friends/:userId', authHandler, asyncHandler(UserController.addFriend));
router.delete('/friends/:userId', authHandler, asyncHandler(UserController.removeFriend));

export default router;