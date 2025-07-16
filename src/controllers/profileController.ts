import { Request, Response } from 'express';
import Joi from 'joi';
import db from '../models';
import { Op } from 'sequelize';
import { logAuditEvent, AuditActions, TargetTypes } from '../middleware/auditLogger';

const { Profile, Station, User, Role } = db;

// Custom validation functions
const phoneNumberValidator = (value: string, helpers: any) => {
  // Phone number must start with 0 and be exactly 10 digits
  const phoneRegex = /^0\d{9}$/;
  if (!phoneRegex.test(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

const anydeskIdValidator = (value: string, helpers: any) => {
  // AnyDesk ID must be 9 or 10 digits
  const anydeskRegex = /^\d{9,10}$/;
  if (!anydeskRegex.test(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

const teamviewerIdValidator = (value: string, helpers: any) => {
  // TeamViewer ID must be 9 or 10 digits
  const teamviewerRegex = /^\d{9,10}$/;
  if (!teamviewerRegex.test(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

const cloudflareValidator = (value: string, helpers: any) => {
  // Cloudflare link must be in format https://stationname.advafuel.com
  const cloudflareRegex = /^https:\/\/[a-zA-Z0-9\-_]+\.advafuel\.com$/;
  if (!cloudflareRegex.test(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

// Validation schemas
const createProfileSchema = Joi.object({
  stationId: Joi.string().uuid().required(),
  phoneNumber: Joi.string().custom(phoneNumberValidator).required()
    .messages({
      'any.invalid': 'Phone number must start with 0 and be exactly 10 digits (e.g., 0613334247)'
    }),
  anydeskId: Joi.string().custom(anydeskIdValidator).required()
    .messages({
      'any.invalid': 'AnyDesk ID must be 9 or 10 digits'
    }),
  anydeskPass: Joi.string().min(1).max(100).required(),
  teamviewerId: Joi.string().custom(teamviewerIdValidator).required()
    .messages({
      'any.invalid': 'TeamViewer ID must be 9 or 10 digits'
    }),
  teamviewerPass: Joi.string().min(1).max(100).required(),
  ptsPort: Joi.string().min(1).max(10).required(),
  ptsPassword: Joi.string().min(1).max(100).required(),
  posUsername: Joi.string().min(1).max(50).required(),
  posPassword: Joi.string().min(1).max(100).required(),
  cloudflareLink: Joi.string().custom(cloudflareValidator).required()
    .messages({
      'any.invalid': 'Cloudflare link must be in format https://stationname.advafuel.com'
    })
});

const updateProfileSchema = Joi.object({
  phoneNumber: Joi.string().custom(phoneNumberValidator)
    .messages({
      'any.invalid': 'Phone number must start with 0 and be exactly 10 digits (e.g., 0613334247)'
    }),
  anydeskId: Joi.string().custom(anydeskIdValidator)
    .messages({
      'any.invalid': 'AnyDesk ID must be 9 or 10 digits'
    }),
  anydeskPass: Joi.string().min(1).max(100),
  teamviewerId: Joi.string().custom(teamviewerIdValidator)
    .messages({
      'any.invalid': 'TeamViewer ID must be 9 or 10 digits'
    }),
  teamviewerPass: Joi.string().min(1).max(100),
  ptsPort: Joi.string().min(1).max(10),
  ptsPassword: Joi.string().min(1).max(100),
  posUsername: Joi.string().min(1).max(50),
  posPassword: Joi.string().min(1).max(100),
  cloudflareLink: Joi.string().custom(cloudflareValidator)
    .messages({
      'any.invalid': 'Cloudflare link must be in format https://stationname.advafuel.com'
    })
});

const getProfilesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow(''),
  stationId: Joi.string().uuid()
});

// Helper function to check uniqueness
const checkUniqueness = async (field: string, value: string, excludeId?: string) => {
  const whereClause: any = { [field]: value };
  if (excludeId) {
    whereClause.id = { [Op.ne]: excludeId };
  }
  
  const existing = await Profile.findOne({ where: whereClause });
  return !existing;
};

export const createProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = createProfileSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { 
      stationId, phoneNumber, anydeskId, anydeskPass, teamviewerId, 
      teamviewerPass, ptsPort, ptsPassword, posUsername, posPassword, 
      cloudflareLink 
    } = value;

    // Check if station exists
    const station = await Station.findByPk(stationId);
    if (!station) {
      res.status(400).json({
        success: false,
        message: 'Station not found'
      });
      return;
    }

    // Check if station already has a profile
    const existingProfile = await Profile.findOne({ where: { stationId } });
    if (existingProfile) {
      res.status(400).json({
        success: false,
        message: 'Station already has a profile'
      });
      return;
    }

    // Check uniqueness constraints
    const uniquenessChecks = [
      { field: 'ptsPort', value: ptsPort, name: 'PTS Port' },
      { field: 'anydeskId', value: anydeskId, name: 'AnyDesk ID' },
      { field: 'teamviewerId', value: teamviewerId, name: 'TeamViewer ID' }
    ];

    for (const check of uniquenessChecks) {
      const isUnique = await checkUniqueness(check.field, check.value);
      if (!isUnique) {
        res.status(400).json({
          success: false,
          message: `${check.name} already exists`
        });
        return;
      }
    }

    // Create profile
    const profile = await Profile.create({
      stationId,
      phoneNumber,
      anydeskId,
      anydeskPass,
      teamviewerId,
      teamviewerPass,
      ptsPort,
      ptsPassword,
      posUsername,
      posPassword,
      cloudflareLink
    });

    // Fetch created profile with station information
    const createdProfile = await Profile.findByPk(profile.id, {
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
      AuditActions.PROFILE_CREATED,
      TargetTypes.PROFILE,
      profile.id
    );

    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data: {
        profile: createdProfile
      }
    });

  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getProfiles = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { error, value } = getProfilesSchema.validate(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { page, limit, search, stationId } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    
    if (stationId) {
      whereClause.stationId = stationId;
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

    // Fetch profiles with pagination
    const { rows: profiles, count: total } = await Profile.findAndCountAll({
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
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        profiles,
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
    console.error('Get profiles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getProfileById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Profile ID is required'
      });
      return;
    }

    const profile = await Profile.findByPk(id, {
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

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { profile }
    });

  } catch (error) {
    console.error('Get profile by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getProfileByStationId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stationId } = req.params;

    if (!stationId) {
      res.status(400).json({
        success: false,
        message: 'Station ID is required'
      });
      return;
    }

    const profile = await Profile.findOne({
      where: { stationId },
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

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found for this station'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { profile }
    });

  } catch (error) {
    console.error('Get profile by station ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Profile ID is required'
      });
      return;
    }

    // Validate request body
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    // Check if profile exists
    const profile = await Profile.findByPk(id);
    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
      return;
    }

    // Check uniqueness constraints for fields being updated
    const { ptsPort, anydeskId, teamviewerId } = value;
    
    const uniquenessChecks = [];
    if (ptsPort && ptsPort !== profile.ptsPort) {
      uniquenessChecks.push({ field: 'ptsPort', value: ptsPort, name: 'PTS Port' });
    }
    if (anydeskId && anydeskId !== profile.anydeskId) {
      uniquenessChecks.push({ field: 'anydeskId', value: anydeskId, name: 'AnyDesk ID' });
    }
    if (teamviewerId && teamviewerId !== profile.teamviewerId) {
      uniquenessChecks.push({ field: 'teamviewerId', value: teamviewerId, name: 'TeamViewer ID' });
    }

    for (const check of uniquenessChecks) {
      const isUnique = await checkUniqueness(check.field, check.value, id);
      if (!isUnique) {
        res.status(400).json({
          success: false,
          message: `${check.name} already exists`
        });
        return;
      }
    }

    // Update profile
    await profile.update(value);

    // Fetch updated profile with relations
    const updatedProfile = await Profile.findByPk(id, {
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
      AuditActions.PROFILE_UPDATED,
      TargetTypes.PROFILE,
      id
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { profile: updatedProfile }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const deleteProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Profile ID is required'
      });
      return;
    }

    const profile = await Profile.findByPk(id);
    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
      return;
    }

    // Delete profile
    await profile.destroy();

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.PROFILE_DELETED,
      TargetTypes.PROFILE,
      id
    );

    res.status(200).json({
      success: true,
      message: 'Profile deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
