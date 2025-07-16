import { Router } from 'express';
import { 
  createProfile, 
  getProfiles, 
  getProfileById, 
  getProfileByStationId,
  updateProfile, 
  deleteProfile
} from '../controllers/profileController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

// All profile routes require authentication and technician role (or admin)
router.use(authenticateToken);
router.use(authorizeRole(['technician', 'admin']));

// Profile management routes
router.post('/', createProfile);                           // POST /api/profiles - Create new profile
router.get('/', getProfiles);                              // GET /api/profiles - Get all profiles with pagination/filtering
router.get('/station/:stationId', getProfileByStationId);  // GET /api/profiles/station/:stationId - Get profile by station ID (must come before /:id)
router.get('/:id', getProfileById);                        // GET /api/profiles/:id - Get profile by ID
router.put('/:id', updateProfile);                         // PUT /api/profiles/:id - Update profile
router.delete('/:id', deleteProfile);                      // DELETE /api/profiles/:id - Delete profile

export default router;
