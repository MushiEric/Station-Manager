import { Request, Response } from 'express';
import Joi from 'joi';
import db from '../models';
import { Op } from 'sequelize';

const { AuditLog, User, Role } = db;

// Validation schemas
const createAuditLogSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  action: Joi.string().min(1).max(100).required(),
  targetType: Joi.string().min(1).max(50).required(),
  targetId: Joi.string().uuid().required(),
  ipAddress: Joi.string().ip().required()
});

const getAuditLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  userId: Joi.string().uuid(),
  action: Joi.string(),
  targetType: Joi.string(),
  targetId: Joi.string().uuid(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  search: Joi.string().allow('')
});

// Helper function to create audit log
export const createAuditLog = async (
  userId: string,
  action: string,
  targetType: string,
  targetId: string,
  ipAddress: string
): Promise<void> => {
  try {
    await AuditLog.create({
      userId,
      action,
      targetType,
      targetId,
      timestamp: new Date(),
      ipAddress
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error to prevent disrupting main functionality
  }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { error, value } = getAuditLogsSchema.validate(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { page, limit, userId, action, targetType, targetId, startDate, endDate, search } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    
    if (userId) {
      whereClause.userId = userId;
    }

    if (action) {
      whereClause.action = { [Op.iLike]: `%${action}%` };
    }

    if (targetType) {
      whereClause.targetType = targetType;
    }

    if (targetId) {
      whereClause.targetId = targetId;
    }

    // Date range filtering
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.timestamp[Op.lte] = new Date(endDate);
      }
    }

    // Search filtering
    if (search) {
      const searchClause = {
        [Op.or]: [
          { action: { [Op.iLike]: `%${search}%` } },
          { targetType: { [Op.iLike]: `%${search}%` } },
          { '$user.firstName$': { [Op.iLike]: `%${search}%` } },
          { '$user.lastName$': { [Op.iLike]: `%${search}%` } },
          { '$user.username$': { [Op.iLike]: `%${search}%` } }
        ]
      };
      Object.assign(whereClause, searchClause);
    }

    // Fetch audit logs with pagination
    const { rows: auditLogs, count: total } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username'],
        include: [{
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }]
      }],
      limit,
      offset,
      order: [['timestamp', 'DESC']]
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        auditLogs,
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
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getAuditLogById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Audit log ID is required'
      });
      return;
    }

    const auditLog = await AuditLog.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username'],
        include: [{
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }]
      }]
    });

    if (!auditLog) {
      res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { auditLog }
    });

  } catch (error) {
    console.error('Get audit log by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getAuditLogsByUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, action, targetType } = req.query;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = { userId };

    if (action) {
      whereClause.action = { [Op.iLike]: `%${action}%` };
    }

    if (targetType) {
      whereClause.targetType = targetType;
    }

    const { rows: auditLogs, count: total } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username'],
        include: [{
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }]
      }],
      limit: Number(limit),
      offset,
      order: [['timestamp', 'DESC']]
    });

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      data: {
        auditLogs,
        userInfo: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username
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
    console.error('Get audit logs by user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getAuditLogStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, targetType, days = 30 } = req.query;

    // Build base where clause
    const whereClause: any = {};
    if (userId) {
      whereClause.userId = userId;
    }
    if (targetType) {
      whereClause.targetType = targetType;
    }

    // Date range for the last N days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    const recentWhereClause = {
      ...whereClause,
      timestamp: { [Op.gte]: daysAgo }
    };

    // Get overall statistics
    const totalLogs = await AuditLog.count({ where: whereClause });
    const recentLogs = await AuditLog.count({ where: recentWhereClause });

    // Get action statistics
    const actionStats = await AuditLog.findAll({
      where: recentWhereClause,
      attributes: [
        'action',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['action'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']],
      limit: 10
    });

    // Get target type statistics
    const targetTypeStats = await AuditLog.findAll({
      where: recentWhereClause,
      attributes: [
        'targetType',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['targetType'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']],
      limit: 10
    });

    // Get user activity statistics
    const userActivityStats = await AuditLog.findAll({
      where: recentWhereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'username']
      }],
      attributes: [
        'userId',
        [db.sequelize.fn('COUNT', db.sequelize.col('AuditLog.id')), 'count']
      ],
      group: ['userId', 'user.id'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('AuditLog.id')), 'DESC']],
      limit: 10
    });

    // Get daily activity for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await AuditLog.findAll({
      where: {
        ...whereClause,
        timestamp: { [Op.gte]: sevenDaysAgo }
      },
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'date'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: [db.sequelize.fn('DATE', db.sequelize.col('timestamp'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('timestamp')), 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        overall: {
          totalLogs,
          recentLogs: recentLogs,
          period: `Last ${days} days`
        },
        actionStats,
        targetTypeStats,
        userActivityStats,
        dailyStats
      }
    });

  } catch (error) {
    console.error('Get audit log statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Function to get client IP address
export const getClientIP = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         '0.0.0.0';
};
