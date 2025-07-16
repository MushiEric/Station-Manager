import { Request, Response, NextFunction } from 'express';
import { createAuditLog, getClientIP } from '../controllers/auditLogController';

// Define action types
export const AuditActions = {
  // Auth actions
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  
  // User management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
  
  // Role management
  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_DELETED: 'ROLE_DELETED',
  
  // Station management
  STATION_CREATED: 'STATION_CREATED',
  STATION_UPDATED: 'STATION_UPDATED',
  STATION_DELETED: 'STATION_DELETED',
  
  // Profile management
  PROFILE_CREATED: 'PROFILE_CREATED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  PROFILE_DELETED: 'PROFILE_DELETED',
  
  // Backup management
  BACKUP_CREATED: 'BACKUP_CREATED',
  BACKUP_UPDATED: 'BACKUP_UPDATED',
  BACKUP_DELETED: 'BACKUP_DELETED',
  BACKUP_STATUS_BULK_UPDATE: 'BACKUP_STATUS_BULK_UPDATE',
  
  // Backup reminder management
  REMINDER_CREATED: 'REMINDER_CREATED',
  REMINDER_UPDATED: 'REMINDER_UPDATED',
  REMINDER_DELETED: 'REMINDER_DELETED',
  REMINDER_RESOLVED: 'REMINDER_RESOLVED'
} as const;

// Define target types
export const TargetTypes = {
  USER: 'User',
  ROLE: 'Role',
  STATION: 'Station',
  PROFILE: 'Profile',
  BACKUP: 'Backup',
  BACKUP_REMINDER: 'BackupReminder'
} as const;

// Audit logging middleware factory
export const auditLog = (action: string, targetType: string, getTargetId?: (req: Request, res: Response) => string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original send method
    const originalSend = res.send;
    
    // Override send method to capture response
    res.send = function(body: any) {
      // Only log if the request was successful (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = (req as any).user;
        if (user && user.userId) {
          let targetId = 'unknown';
          
          try {
            // Try to get target ID from different sources
            if (getTargetId) {
              targetId = getTargetId(req, res);
            } else if (req.params.id) {
              targetId = req.params.id;
            } else if (req.params.stationId) {
              targetId = req.params.stationId;
            } else if (req.params.userId) {
              targetId = req.params.userId;
            } else if (body && typeof body === 'string') {
              try {
                const parsedBody = JSON.parse(body);
                if (parsedBody.data && parsedBody.data.id) {
                  targetId = parsedBody.data.id;
                } else if (parsedBody.data && parsedBody.data.user && parsedBody.data.user.id) {
                  targetId = parsedBody.data.user.id;
                } else if (parsedBody.data && parsedBody.data.station && parsedBody.data.station.id) {
                  targetId = parsedBody.data.station.id;
                } else if (parsedBody.data && parsedBody.data.profile && parsedBody.data.profile.id) {
                  targetId = parsedBody.data.profile.id;
                } else if (parsedBody.data && parsedBody.data.backup && parsedBody.data.backup.id) {
                  targetId = parsedBody.data.backup.id;
                } else if (parsedBody.data && parsedBody.data.reminder && parsedBody.data.reminder.id) {
                  targetId = parsedBody.data.reminder.id;
                } else if (parsedBody.data && parsedBody.data.role && parsedBody.data.role.id) {
                  targetId = parsedBody.data.role.id;
                }
              } catch (parseError) {
                // If body parsing fails, keep targetId as 'unknown'
              }
            }
            
            const ipAddress = getClientIP(req);
            
            // Create audit log asynchronously (don't wait for it)
            createAuditLog(user.userId, action, targetType, targetId, ipAddress)
              .catch(error => {
                console.error('Failed to create audit log:', error);
              });
          } catch (error) {
            console.error('Error in audit logging middleware:', error);
          }
        }
      }
      
      // Call original send method
      return originalSend.call(this, body);
    };
    
    next();
  };
};

// Helper function to create audit log manually
export const logAuditEvent = async (
  req: Request,
  action: string,
  targetType: string,
  targetId: string
): Promise<void> => {
  try {
    const user = (req as any).user;
    if (user && user.userId) {
      const ipAddress = getClientIP(req);
      await createAuditLog(user.userId, action, targetType, targetId, ipAddress);
    }
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};

// Predefined audit middlewares for common actions
export const auditUserCreated = auditLog(AuditActions.USER_CREATED, TargetTypes.USER);
export const auditUserUpdated = auditLog(AuditActions.USER_UPDATED, TargetTypes.USER);
export const auditUserDeleted = auditLog(AuditActions.USER_DELETED, TargetTypes.USER);

export const auditRoleCreated = auditLog(AuditActions.ROLE_CREATED, TargetTypes.ROLE);
export const auditRoleUpdated = auditLog(AuditActions.ROLE_UPDATED, TargetTypes.ROLE);
export const auditRoleDeleted = auditLog(AuditActions.ROLE_DELETED, TargetTypes.ROLE);

export const auditStationCreated = auditLog(AuditActions.STATION_CREATED, TargetTypes.STATION);
export const auditStationUpdated = auditLog(AuditActions.STATION_UPDATED, TargetTypes.STATION);
export const auditStationDeleted = auditLog(AuditActions.STATION_DELETED, TargetTypes.STATION);

export const auditProfileCreated = auditLog(AuditActions.PROFILE_CREATED, TargetTypes.PROFILE);
export const auditProfileUpdated = auditLog(AuditActions.PROFILE_UPDATED, TargetTypes.PROFILE);
export const auditProfileDeleted = auditLog(AuditActions.PROFILE_DELETED, TargetTypes.PROFILE);

export const auditBackupCreated = auditLog(AuditActions.BACKUP_CREATED, TargetTypes.BACKUP);
export const auditBackupUpdated = auditLog(AuditActions.BACKUP_UPDATED, TargetTypes.BACKUP);
export const auditBackupDeleted = auditLog(AuditActions.BACKUP_DELETED, TargetTypes.BACKUP);

export const auditReminderCreated = auditLog(AuditActions.REMINDER_CREATED, TargetTypes.BACKUP_REMINDER);
export const auditReminderUpdated = auditLog(AuditActions.REMINDER_UPDATED, TargetTypes.BACKUP_REMINDER);
export const auditReminderDeleted = auditLog(AuditActions.REMINDER_DELETED, TargetTypes.BACKUP_REMINDER);
export const auditReminderResolved = auditLog(AuditActions.REMINDER_RESOLVED, TargetTypes.BACKUP_REMINDER);
