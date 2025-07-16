import { Router } from 'express';
import { 
  createStation, 
  getStations, 
  getStationById, 
  updateStation, 
  deleteStation,
  getStationStats
} from '../controllers/stationController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

// All station routes require authentication and technician role (or admin)
router.use(authenticateToken);
router.use(authorizeRole(['technician', 'admin']));

// Station management routes
router.post('/', createStation);                    // POST /api/stations - Create new station
router.get('/', getStations);                       // GET /api/stations - Get all stations with pagination/filtering
router.get('/:id/stats', getStationStats);          // GET /api/stations/:id/stats - Get station statistics (must come before /:id)
router.get('/:id', getStationById);                 // GET /api/stations/:id - Get station by ID with details
router.put('/:id', updateStation);                  // PUT /api/stations/:id - Update station
router.delete('/:id', deleteStation);               // DELETE /api/stations/:id - Delete station

export default router;
