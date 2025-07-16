import { Request, Response } from 'express';
import Joi from 'joi';
import db from '../models';
import { Op } from 'sequelize';
import { logAuditEvent, AuditActions, TargetTypes } from '../middleware/auditLogger';

const { Backup, Station, User, Role } = db;

// Validation schemas
const createBackupSchema = Joi.object({
  stationId: Joi.string().uuid().required(),
  status: Joi.string().valid('pending', 'completed', 'failed').default('pending'),
  lastBackupDate: Joi.date().iso().required()
});

const updateBackupSchema = Joi.object({
  status: Joi.string().valid('pending', 'completed', 'failed'),
  lastBackupDate: Joi.date().iso()
});

const getBackupsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('pending', 'completed', 'failed'),
  stationId: Joi.string().uuid(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  search: Joi.string().allow('')
});

export const createBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = createBackupSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { stationId, status, lastBackupDate } = value;

    // Check if station exists
    const station = await Station.findByPk(stationId);
    if (!station) {
      res.status(400).json({
        success: false,
        message: 'Station not found'
      });
      return;
    }

    // Create backup
    const backup = await Backup.create({
      stationId,
      status,
      lastBackupDate
    });

    // Fetch created backup with station information
    const createdBackup = await Backup.findByPk(backup.id, {
      include: [{
        model: Station,
        as: 'station',
        attributes: ['id', 'stationName', 'serialNumber', 'location'],
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }]
      }]
    });

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.BACKUP_CREATED,
      TargetTypes.BACKUP,
      backup.id
    );

    res.status(201).json({
      success: true,
      message: 'Backup created successfully',
      data: {
        backup: createdBackup
      }
    });

  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getBackups = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { error, value } = getBackupsSchema.validate(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { page, limit, status, stationId, startDate, endDate, search } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (stationId) {
      whereClause.stationId = stationId;
    }

    // Date range filtering
    if (startDate || endDate) {
      whereClause.lastBackupDate = {};
      if (startDate) {
        whereClause.lastBackupDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.lastBackupDate[Op.lte] = new Date(endDate);
      }
    }

    // Build station where clause for search
    const stationWhereClause: any = {};
    if (search) {
      stationWhereClause[Op.or] = [
        { stationName: { [Op.iLike]: `%${search}%` } },
        { serialNumber: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Fetch backups with pagination
    const { rows: backups, count: total } = await Backup.findAndCountAll({
      where: whereClause,
      include: [{
        model: Station,
        as: 'station',
        where: Object.keys(stationWhereClause).length > 0 ? stationWhereClause : undefined,
        attributes: ['id', 'stationName', 'serialNumber', 'location'],
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }]
      }],
      limit,
      offset,
      order: [['lastBackupDate', 'DESC']]
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        backups,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getBackupById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Backup ID is required'
      });
      return;
    }

    const backup = await Backup.findByPk(id, {
      include: [{
        model: Station,
        as: 'station',
        attributes: ['id', 'stationName', 'serialNumber', 'location'],
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username'],
          include: [{
            model: Role,
            as: 'role',
            attributes: ['id', 'name']
          }]
        }]
      }]
    });

    if (!backup) {
      res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { backup }
    });

  } catch (error) {
    console.error('Get backup by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getBackupsByStationId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stationId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    if (!stationId) {
      res.status(400).json({
        success: false,
        message: 'Station ID is required'
      });
      return;
    }

    // Check if station exists
    const station = await Station.findByPk(stationId);
    if (!station) {
      res.status(404).json({
        success: false,
        message: 'Station not found'
      });
      return;
    }

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = { stationId };

    if (status) {
      whereClause.status = status;
    }

    const { rows: backups, count: total } = await Backup.findAndCountAll({
      where: whereClause,
      include: [{
        model: Station,
        as: 'station',
        attributes: ['id', 'stationName', 'serialNumber', 'location']
      }],
      limit: Number(limit),
      offset,
      order: [['lastBackupDate', 'DESC']]
    });

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      data: {
        backups,
        stationInfo: {
          id: station.id,
          stationName: station.stationName,
          serialNumber: station.serialNumber,
          location: station.location
        },
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalItems: total,
          itemsPerPage: Number(limit),
          hasNextPage: Number(page) < totalPages,
          hasPreviousPage: Number(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get backups by station ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const updateBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Backup ID is required'
      });
      return;
    }

    // Validate request body
    const { error, value } = updateBackupSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    // Check if backup exists
    const backup = await Backup.findByPk(id);
    if (!backup) {
      res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
      return;
    }

    // Update backup
    await backup.update(value);

    // Fetch updated backup with relations
    const updatedBackup = await Backup.findByPk(id, {
      include: [{
        model: Station,
        as: 'station',
        attributes: ['id', 'stationName', 'serialNumber', 'location'],
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }]
      }]
    });

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.BACKUP_UPDATED,
      TargetTypes.BACKUP,
      id
    );

    res.status(200).json({
      success: true,
      message: 'Backup updated successfully',
      data: { backup: updatedBackup }
    });

  } catch (error) {
    console.error('Update backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const deleteBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Backup ID is required'
      });
      return;
    }

    const backup = await Backup.findByPk(id);
    if (!backup) {
      res.status(404).json({
        success: false,
        message: 'Backup not found'
      });
      return;
    }

    // Delete backup
    await backup.destroy();

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.BACKUP_DELETED,
      TargetTypes.BACKUP,
      id
    );

    res.status(200).json({
      success: true,
      message: 'Backup deleted successfully'
    });

  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getBackupStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stationId } = req.query;

    // Build base where clause
    const whereClause: any = {};
    if (stationId) {
      whereClause.stationId = stationId;
    }

    // Get overall statistics
    const totalBackups = await Backup.count({ where: whereClause });
    const completedBackups = await Backup.count({ 
      where: { ...whereClause, status: 'completed' } 
    });
    const failedBackups = await Backup.count({ 
      where: { ...whereClause, status: 'failed' } 
    });
    const pendingBackups = await Backup.count({ 
      where: { ...whereClause, status: 'pending' } 
    });

    // Get statistics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentBackups = await Backup.count({
      where: {
        ...whereClause,
        lastBackupDate: { [Op.gte]: thirtyDaysAgo }
      }
    });

    const recentCompletedBackups = await Backup.count({
      where: {
        ...whereClause,
        status: 'completed',
        lastBackupDate: { [Op.gte]: thirtyDaysAgo }
      }
    });

    // Get last backup
    const lastBackup = await Backup.findOne({
      where: whereClause,
      include: [{
        model: Station,
        as: 'station',
        attributes: ['id', 'stationName', 'serialNumber']
      }],
      order: [['lastBackupDate', 'DESC']],
      attributes: ['id', 'status', 'lastBackupDate', 'stationId']
    });

    // Get daily backup counts for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await Backup.findAll({
      where: {
        ...whereClause,
        lastBackupDate: { [Op.gte]: sevenDaysAgo }
      },
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('lastBackupDate')), 'date'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        'status'
      ],
      group: [
        db.sequelize.fn('DATE', db.sequelize.col('lastBackupDate')),
        'status'
      ],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('lastBackupDate')), 'DESC']]
    });

    // Calculate success rate
    const successRate = totalBackups > 0 ? ((completedBackups / totalBackups) * 100).toFixed(2) : '0';
    const recentSuccessRate = recentBackups > 0 ? ((recentCompletedBackups / recentBackups) * 100).toFixed(2) : '0';

    res.status(200).json({
      success: true,
      data: {
        overall: {
          total: totalBackups,
          completed: completedBackups,
          failed: failedBackups,
          pending: pendingBackups,
          successRate: successRate + '%'
        },
        recent: {
          totalLast30Days: recentBackups,
          completedLast30Days: recentCompletedBackups,
          successRateLast30Days: recentSuccessRate + '%'
        },
        lastBackup,
        dailyStats
      }
    });

  } catch (error) {
    console.error('Get backup statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const bulkUpdateBackupStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { backupIds, status } = req.body;

    // Validate request body
    const bulkUpdateSchema = Joi.object({
      backupIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
      status: Joi.string().valid('pending', 'completed', 'failed').required()
    });

    const { error } = bulkUpdateSchema.validate({ backupIds, status });
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    // Update backups
    const [updatedCount] = await Backup.update(
      { status },
      {
        where: {
          id: { [Op.in]: backupIds }
        }
      }
    );

    if (updatedCount === 0) {
      res.status(404).json({
        success: false,
        message: 'No backups found with the provided IDs'
      });
      return;
    }

    // Log audit event for bulk update
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.BACKUP_STATUS_BULK_UPDATE,
      TargetTypes.BACKUP,
      `bulk-${backupIds.length}-backups`
    );

    res.status(200).json({
      success: true,
      message: `${updatedCount} backup(s) updated successfully`,
      data: {
        updatedCount,
        newStatus: status
      }
    });

  } catch (error) {
    console.error('Bulk update backup status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
