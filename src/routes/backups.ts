import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import {
  createBackup,
  getBackups,
  getBackupById,
  getBackupsByStationId,
  updateBackup,
  deleteBackup,
  getBackupStatistics,
  bulkUpdateBackupStatus
} from '../controllers/backupController';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply role-based authorization (technician or admin only)
router.use(authorizeRole(['technician', 'admin']));

// Backup management routes
router.post('/', createBackup);
router.get('/', getBackups);
router.get('/statistics', getBackupStatistics);
router.patch('/bulk-update-status', bulkUpdateBackupStatus);
router.get('/station/:stationId', getBackupsByStationId);
router.get('/:id', getBackupById);
router.patch('/:id', updateBackup);
router.delete('/:id', deleteBackup);

export default router;
