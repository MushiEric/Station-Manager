import { Router } from 'express';
import { register, login, getProfile, updateProfile, changePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);

export default router;
