import { Router } from 'express';
import { 
  createUser, 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  resetUserPassword 
} from '../controllers/userController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

// All user management routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRole(['admin']));

// User management routes
router.post('/', createUser);              // POST /api/users - Create new user
router.get('/', getUsers);                 // GET /api/users - Get all users with pagination/filtering
router.get('/:id', getUserById);           // GET /api/users/:id - Get user by ID
router.put('/:id', updateUser);            // PUT /api/users/:id - Update user
router.delete('/:id', deleteUser);         // DELETE /api/users/:id - Deactivate user
router.put('/:id/reset-password', resetUserPassword); // PUT /api/users/:id/reset-password - Reset user password

export default router;
