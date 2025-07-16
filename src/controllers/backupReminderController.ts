import { Request, Response } from 'express';
import Joi from 'joi';
import db from '../models';
import { Op } from 'sequelize';

const { BackupReminder, Station, User, Role } = db;

// Validation schemas
const createReminderSchema = Joi.object({
  stationId: Joi.string().uuid().required(),
  reminderDate: Joi.date().iso().required(),
  message: Joi.string().min(1).max(500).required(),
  notifiedTo: Joi.string().email().required()
});

const updateReminderSchema = Joi.object({
  reminderDate: Joi.date().iso(),
  message: Joi.string().min(1).max(500),
  notifiedTo: Joi.string().email(),
  isResolved: Joi.boolean()
});

const getRemindersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  stationId: Joi.string().uuid(),
  isResolved: Joi.boolean(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  search: Joi.string().allow('')
});

export const createReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = createReminderSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { stationId, reminderDate, message, notifiedTo } = value;

    // Check if station exists
    const station = await Station.findByPk(stationId);
    if (!station) {
      res.status(400).json({
        success: false,
        message: 'Station not found'
      });
      return;
    }

    // Create reminder
    const reminder = await BackupReminder.create({
      stationId,
      reminderDate,
      message,
      notifiedTo,
      isResolved: false
    });

    // Fetch created reminder with station information
    const createdReminder = await BackupReminder.findByPk(reminder.id, {
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

    res.status(201).json({
      success: true,
      message: 'Backup reminder created successfully',
      data: {
        reminder: createdReminder
      }
    });

  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { error, value } = getRemindersSchema.validate(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { page, limit, stationId, isResolved, startDate, endDate, search } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    
    if (stationId) {
      whereClause.stationId = stationId;
    }

    if (typeof isResolved === 'boolean') {
      whereClause.isResolved = isResolved;
    }

    // Date range filtering
    if (startDate || endDate) {
      whereClause.reminderDate = {};
      if (startDate) {
        whereClause.reminderDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.reminderDate[Op.lte] = new Date(endDate);
      }
    }

    // Build station where clause for search
    const stationWhereClause: any = {};
    if (search) {
      const searchClause = {
        [Op.or]: [
          { '$station.stationName$': { [Op.iLike]: `%${search}%` } },
          { '$station.serialNumber$': { [Op.iLike]: `%${search}%` } },
          { '$station.location$': { [Op.iLike]: `%${search}%` } },
          { message: { [Op.iLike]: `%${search}%` } },
          { notifiedTo: { [Op.iLike]: `%${search}%` } }
        ]
      };
      Object.assign(whereClause, searchClause);
    }

    // Fetch reminders with pagination
    const { rows: reminders, count: total } = await BackupReminder.findAndCountAll({
      where: whereClause,
      include: [{
        model: Station,
        as: 'station',
        attributes: ['id', 'stationName', 'serialNumber', 'location'],
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'username']
        }]
      }],
      limit,
      offset,
      order: [['reminderDate', 'ASC']]
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        reminders,
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
    console.error('Get reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getReminderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Reminder ID is required'
      });
      return;
    }

    const reminder = await BackupReminder.findByPk(id, {
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

    if (!reminder) {
      res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { reminder }
    });

  } catch (error) {
    console.error('Get reminder by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getRemindersByStationId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stationId } = req.params;
    const { page = 1, limit = 10, isResolved } = req.query;

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

    if (typeof isResolved === 'string') {
      whereClause.isResolved = isResolved === 'true';
    }

    const { rows: reminders, count: total } = await BackupReminder.findAndCountAll({
      where: whereClause,
      include: [{
        model: Station,
        as: 'station',
        attributes: ['id', 'stationName', 'serialNumber', 'location']
      }],
      limit: Number(limit),
      offset,
      order: [['reminderDate', 'ASC']]
    });

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      data: {
        reminders,
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
    console.error('Get reminders by station ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const updateReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Reminder ID is required'
      });
      return;
    }

    // Validate request body
    const { error, value } = updateReminderSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    // Check if reminder exists
    const reminder = await BackupReminder.findByPk(id);
    if (!reminder) {
      res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
      return;
    }

    // Update reminder
    await reminder.update(value);

    // Fetch updated reminder with relations
    const updatedReminder = await BackupReminder.findByPk(id, {
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

    res.status(200).json({
      success: true,
      message: 'Reminder updated successfully',
      data: { reminder: updatedReminder }
    });

  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const deleteReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Reminder ID is required'
      });
      return;
    }

    const reminder = await BackupReminder.findByPk(id);
    if (!reminder) {
      res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
      return;
    }

    // Delete reminder
    await reminder.destroy();

    res.status(200).json({
      success: true,
      message: 'Reminder deleted successfully'
    });

  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const markReminderAsResolved = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Reminder ID is required'
      });
      return;
    }

    const reminder = await BackupReminder.findByPk(id);
    if (!reminder) {
      res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
      return;
    }

    // Mark as resolved
    await reminder.update({ isResolved: true });

    // Fetch updated reminder with relations
    const updatedReminder = await BackupReminder.findByPk(id, {
      include: [{
        model: Station,
        as: 'station',
        attributes: ['id', 'stationName', 'serialNumber', 'location']
      }]
    });

    res.status(200).json({
      success: true,
      message: 'Reminder marked as resolved',
      data: { reminder: updatedReminder }
    });

  } catch (error) {
    console.error('Mark reminder as resolved error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getReminderStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stationId } = req.query;

    // Build base where clause
    const whereClause: any = {};
    if (stationId) {
      whereClause.stationId = stationId;
    }

    // Get overall statistics
    const totalReminders = await BackupReminder.count({ where: whereClause });
    const resolvedReminders = await BackupReminder.count({ 
      where: { ...whereClause, isResolved: true } 
    });
    const pendingReminders = await BackupReminder.count({ 
      where: { ...whereClause, isResolved: false } 
    });

    // Get overdue reminders (past due and not resolved)
    const now = new Date();
    const overdueReminders = await BackupReminder.count({
      where: {
        ...whereClause,
        isResolved: false,
        reminderDate: { [Op.lt]: now }
      }
    });

    // Get upcoming reminders (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingReminders = await BackupReminder.count({
      where: {
        ...whereClause,
        isResolved: false,
        reminderDate: { 
          [Op.between]: [now, nextWeek]
        }
      }
    });

    // Get recent reminders by station
    const stationStats = await BackupReminder.findAll({
      where: whereClause,
      include: [{
        model: Station,
        as: 'station',
        attributes: ['id', 'stationName', 'serialNumber']
      }],
      attributes: [
        'stationId',
        [db.sequelize.fn('COUNT', db.sequelize.col('BackupReminder.id')), 'totalCount'],
        [db.sequelize.fn('SUM', db.sequelize.literal('CASE WHEN isResolved = true THEN 1 ELSE 0 END')), 'resolvedCount']
      ],
      group: ['stationId', 'station.id'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('BackupReminder.id')), 'DESC']],
      limit: 10
    });

    res.status(200).json({
      success: true,
      data: {
        overall: {
          total: totalReminders,
          resolved: resolvedReminders,
          pending: pendingReminders,
          overdue: overdueReminders,
          upcoming: upcomingReminders
        },
        stationStats
      }
    });

  } catch (error) {
    console.error('Get reminder statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
