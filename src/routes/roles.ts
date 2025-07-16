import { Router } from 'express';
import { 
  createRole, 
  getRoles, 
  getRoleById, 
  updateRole, 
  deleteRole 
} from '../controllers/roleController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

// All role management routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRole(['admin']));

// Role management routes
router.post('/', createRole);              // POST /api/roles - Create new role
router.get('/', getRoles);                 // GET /api/roles - Get all roles with pagination/filtering
router.get('/:id', getRoleById);           // GET /api/roles/:id - Get role by ID
router.put('/:id', updateRole);            // PUT /api/roles/:id - Update role
router.delete('/:id', deleteRole);         // DELETE /api/roles/:id - Deactivate role

export default router;
