import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import {
  auditReminderCreated,
  auditReminderUpdated,
  auditReminderDeleted,
  auditReminderResolved
} from '../middleware/auditLogger';
import {
  createReminder,
  getReminders,
  getReminderById,
  getRemindersByStationId,
  updateReminder,
  deleteReminder,
  markReminderAsResolved,
  getReminderStatistics
} from '../controllers/backupReminderController';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply role-based authorization (technician or admin only)
router.use(authorizeRole(['technician', 'admin']));

// Backup reminder management routes
router.post('/', auditReminderCreated, createReminder);
router.get('/', getReminders);
router.get('/statistics', getReminderStatistics);
router.get('/station/:stationId', getRemindersByStationId);
router.get('/:id', getReminderById);
router.patch('/:id', auditReminderUpdated, updateReminder);
router.patch('/:id/resolve', auditReminderResolved, markReminderAsResolved);
router.delete('/:id', auditReminderDeleted, deleteReminder);

export default router;
