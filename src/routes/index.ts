import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import roleRoutes from './roles';
import stationRoutes from './stations';
import profileRoutes from './profiles';
import backupRoutes from './backups';
import backupReminderRoutes from './backupReminders';
import auditLogRoutes from './auditLogs';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount user management routes
router.use('/users', userRoutes);

// Mount role management routes
router.use('/roles', roleRoutes);

// Mount station management routes
router.use('/stations', stationRoutes);

// Mount profile management routes
router.use('/profiles', profileRoutes);

// Mount backup management routes
router.use('/backups', backupRoutes);

// Mount backup reminder management routes
router.use('/backup-reminders', backupReminderRoutes);

// Mount audit log routes
router.use('/audit-logs', auditLogRoutes);

export default router;
