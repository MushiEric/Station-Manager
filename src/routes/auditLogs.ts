import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import {
  getAuditLogs,
  getAuditLogById,
  getAuditLogsByUser,
  getAuditLogStatistics
} from '../controllers/auditLogController';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply role-based authorization (admin only for audit logs)
router.use(authorizeRole(['admin']));

// Audit log management routes (read-only)
router.get('/', getAuditLogs);
router.get('/statistics', getAuditLogStatistics);
router.get('/user/:userId', getAuditLogsByUser);
router.get('/:id', getAuditLogById);

export default router;
