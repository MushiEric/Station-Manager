import { Request, Response } from 'express';
import Joi from 'joi';
import db from '../models';
import { Op } from 'sequelize';
import { logAuditEvent, AuditActions, TargetTypes } from '../middleware/auditLogger';

const { Station, User, Role, Profile, Backup, BackupReminder } = db;

// Validation schemas
const createStationSchema = Joi.object({
  stationName: Joi.string().min(2).max(100).required(),
  serialNumber: Joi.string().min(1).max(50).required(),
  location: Joi.string().min(2).max(200).required()
});

const updateStationSchema = Joi.object({
  stationName: Joi.string().min(2).max(100),
  serialNumber: Joi.string().min(1).max(50),
  location: Joi.string().min(2).max(200)
});

const getStationsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow(''),
  location: Joi.string().allow(''),
  createdBy: Joi.string().uuid()
});

export const createStation = async (req: Request, res: Response): Promise<void> => {
  try {
   
    const { error, value } = createStationSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { stationName, serialNumber, location } = value;
    const createdBy = (req as any).user?.userId;

    // Check if serial number already exists
    const existingStation = await Station.findOne({
      where: { serialNumber }
    });

    if (existingStation) {
      res.status(400).json({
        success: false,
        message: 'Serial number already exists'
      });
      return;
    }

    // Create station
    const station = await Station.create({
      stationName,
      serialNumber,
      location,
      createdBy
    });

    // Fetch created station with creator information
    const createdStation = await Station.findByPk(station.id, {
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
    });

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.STATION_CREATED,
      TargetTypes.STATION,
      station.id
    );

    res.status(201).json({
      success: true,
      message: 'Station created successfully',
      data: {
        station: createdStation
      }
    });

  } catch (error) {
    console.error('Create station error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getStations = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { error, value } = getStationsSchema.validate(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { page, limit, search, location, createdBy } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    
    if (search) {
      whereClause[Op.or] = [
        { stationName: { [Op.iLike]: `%${search}%` } },
        { serialNumber: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (location) {
      whereClause.location = { [Op.iLike]: `%${location}%` };
    }
    
    if (createdBy) {
      whereClause.createdBy = createdBy;
    }

    // Fetch stations with pagination
    const { rows: stations, count: total } = await Station.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username'],
          include: [{
            model: Role,
            as: 'role',
            attributes: ['id', 'name']
          }]
        },
        {
          model: Profile,
          as: 'profile',
          required: false,
          attributes: ['id', 'phoneNumber', 'anydeskId', 'teamviewerId']
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        stations,
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
    console.error('Get stations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getStationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Station ID is required'
      });
      return;
    }

    const station = await Station.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username'],
          include: [{
            model: Role,
            as: 'role',
            attributes: ['id', 'name']
          }]
        },
        {
          model: Profile,
          as: 'profile',
          required: false
        },
        {
          model: Backup,
          as: 'backups',
          required: false,
          limit: 5,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'status', 'lastBackupDate', 'createdAt']
        },
        {
          model: BackupReminder,
          as: 'backupReminders',
          required: false,
          where: { isResolved: false },
          limit: 5,
          order: [['reminderDate', 'ASC']],
          attributes: ['id', 'reminderDate', 'message', 'isResolved']
        }
      ]
    });

    if (!station) {
      res.status(404).json({
        success: false,
        message: 'Station not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { station }
    });

  } catch (error) {
    console.error('Get station by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const updateStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Station ID is required'
      });
      return;
    }

    // Validate request body
    const { error, value } = updateStationSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { stationName, serialNumber, location } = value;

    // Check if station exists
    const station = await Station.findByPk(id);
    if (!station) {
      res.status(404).json({
        success: false,
        message: 'Station not found'
      });
      return;
    }

    // Check if serial number already exists (if being updated)
    if (serialNumber && serialNumber !== station.serialNumber) {
      const existingStation = await Station.findOne({
        where: { 
          serialNumber,
          id: { [Op.ne]: id }
        }
      });

      if (existingStation) {
        res.status(400).json({
          success: false,
          message: 'Serial number already exists'
        });
        return;
      }
    }

    // Update station
    await station.update(value);

    // Fetch updated station with relations
    const updatedStation = await Station.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username'],
          include: [{
            model: Role,
            as: 'role',
            attributes: ['id', 'name']
          }]
        },
        {
          model: Profile,
          as: 'profile',
          required: false
        }
      ]
    });

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.STATION_UPDATED,
      TargetTypes.STATION,
      id
    );

    res.status(200).json({
      success: true,
      message: 'Station updated successfully',
      data: { station: updatedStation }
    });

  } catch (error) {
    console.error('Update station error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const deleteStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Station ID is required'
      });
      return;
    }

    const station = await Station.findByPk(id);
    if (!station) {
      res.status(404).json({
        success: false,
        message: 'Station not found'
      });
      return;
    }

    // Check if station has related data
    const backupCount = await Backup.count({ where: { stationId: id } });
    const reminderCount = await BackupReminder.count({ where: { stationId: id } });
    const hasProfile = await Profile.findOne({ where: { stationId: id } });

    if (backupCount > 0 || reminderCount > 0 || hasProfile) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete station with associated data (backups, reminders, or profile). Please remove associated data first.',
        details: {
          backupCount,
          reminderCount,
          hasProfile: !!hasProfile
        }
      });
      return;
    }

    // Delete station
    await station.destroy();

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.STATION_DELETED,
      TargetTypes.STATION,
      id
    );

    res.status(200).json({
      success: true,
      message: 'Station deleted successfully'
    });

  } catch (error) {
    console.error('Delete station error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getStationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Station ID is required'
      });
      return;
    }

    const station = await Station.findByPk(id);
    if (!station) {
      res.status(404).json({
        success: false,
        message: 'Station not found'
      });
      return;
    }

    // Get statistics
    const totalBackups = await Backup.count({ where: { stationId: id } });
    const completedBackups = await Backup.count({ 
      where: { stationId: id, status: 'completed' } 
    });
    const failedBackups = await Backup.count({ 
      where: { stationId: id, status: 'failed' } 
    });
    const pendingBackups = await Backup.count({ 
      where: { stationId: id, status: 'pending' } 
    });
    
    const totalReminders = await BackupReminder.count({ where: { stationId: id } });
    const unresolvedReminders = await BackupReminder.count({ 
      where: { stationId: id, isResolved: false } 
    });

    // Get last backup
    const lastBackup = await Backup.findOne({
      where: { stationId: id },
      order: [['lastBackupDate', 'DESC']],
      attributes: ['id', 'status', 'lastBackupDate']
    });

    res.status(200).json({
      success: true,
      data: {
        stationId: id,
        stationName: station.stationName,
        stats: {
          backups: {
            total: totalBackups,
            completed: completedBackups,
            failed: failedBackups,
            pending: pendingBackups,
            successRate: totalBackups > 0 ? ((completedBackups / totalBackups) * 100).toFixed(2) : 0
          },
          reminders: {
            total: totalReminders,
            unresolved: unresolvedReminders,
            resolved: totalReminders - unresolvedReminders
          },
          lastBackup
        }
      }
    });

  } catch (error) {
    console.error('Get station stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
