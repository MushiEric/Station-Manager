import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import db from '../models';
import { Op } from 'sequelize';
import { logAuditEvent, AuditActions, TargetTypes } from '../middleware/auditLogger';

const { User, Role } = db;

// Validation schemas
const createUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  password: Joi.string().min(6).required(),
  roleId: Joi.string().uuid().required(),
  status: Joi.string().valid('active', 'inactive').default('active')
});

const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  status: Joi.string().valid('active', 'inactive'),
  roleId: Joi.string().uuid()
});

const getUsersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow(''),
  status: Joi.string().valid('active', 'inactive'),
  roleId: Joi.string().uuid()
});

// Helper function to generate unique username
const generateUsername = async (firstName: string, lastName: string): Promise<string> => {
  // Convert to lowercase and remove spaces
  const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/\s+/g, '');
  
  let username = baseUsername;
  let counter = 1;
  
  // Check if username exists and increment counter if needed
  while (true) {
    const existingUser = await User.findOne({
      where: { username }
    });
    
    if (!existingUser) {
      break;
    }
    
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  return username;
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { firstName, lastName, password, roleId, status } = value;

    // Check if role exists
    const role = await Role.findByPk(roleId);
    if (!role) {
      res.status(400).json({
        success: false,
        message: 'Invalid role ID'
      });
      return;
    }

    // Generate unique username
    const username = await generateUsername(firstName, lastName);

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      username,
      password: hashedPassword,
      roleId,
      status
    });

    // Fetch user with role information
    const createdUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'status']
      }]
    });

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.USER_CREATED,
      TargetTypes.USER,
      user.id
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: createdUser
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { error, value } = getUsersSchema.validate(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { page, limit, search, status, roleId } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (roleId) {
      whereClause.roleId = roleId;
    }

    // Fetch users with pagination
    const { rows: users, count: total } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'status']
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        users,
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
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'status']
      }]
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    // Validate request body
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { firstName, lastName, status, roleId } = value;

    // Check if user exists
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if role exists (if roleId is provided)
    if (roleId) {
      const role = await Role.findByPk(roleId);
      if (!role) {
        res.status(400).json({
          success: false,
          message: 'Invalid role ID'
        });
        return;
      }
    }

    // Update user
    await user.update(value);

    // Fetch updated user with role information
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'status']
      }]
    });

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.USER_UPDATED,
      TargetTypes.USER,
      id
    );

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUserId = (req as any).user?.userId;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    // Prevent self-deletion
    if (id === currentUserId) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Soft delete by setting status to inactive
    await user.update({ status: 'inactive' });

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.USER_DELETED,
      TargetTypes.USER,
      id
    );

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    // Validate new password
    const resetPasswordSchema = Joi.object({
      newPassword: Joi.string().min(6).required()
    });

    const { error } = resetPasswordSchema.validate({ newPassword });
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await user.update({ password: hashedPassword });

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.USER_PASSWORD_RESET,
      TargetTypes.USER,
      id
    );

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
