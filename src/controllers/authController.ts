import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import db from '../models';
import { Op } from 'sequelize';
import { logAuditEvent, AuditActions, TargetTypes } from '../middleware/auditLogger';
import { createAuditLog, getClientIP } from './auditLogController';

const { User, Role } = db;

// Validation schemas
const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  password: Joi.string().min(6).required(),
  roleId: Joi.string().uuid().required(),
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
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

// Generate JWT token
const generateToken = (userId: string): string => {
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-here';
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '24h' });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { firstName, lastName, password, roleId } = value;

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
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      username,
      password: hashedPassword,
      roleId,
      status: 'active'
    });

    // Log audit event for user registration
    const ipAddress = getClientIP(req);
    await createAuditLog(user.id, AuditActions.USER_REGISTERED, TargetTypes.USER, user.id, ipAddress);

    // Generate token
    const token = generateToken(user.id);

    // Return user data (without password)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          status: user.status,
          roleId: user.roleId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { username, password } = value;

    // Find user by username
    const user = await User.findOne({
      where: { username },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'status']
      }]
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Check if user is active
    if (user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Generate token
    const token = generateToken(user.id);

    // Log audit event for user login
    const ipAddress = getClientIP(req);
    await createAuditLog(user.id, AuditActions.USER_LOGIN, TargetTypes.USER, user.id, ipAddress);

    // Return user data (without password)
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          status: user.status,
          roleId: user.roleId,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const user = await User.findByPk(userId, {
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
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { firstName, lastName } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    // Validation for update
    const updateSchema = Joi.object({
      firstName: Joi.string().min(2).max(50),
      lastName: Joi.string().min(2).max(50)
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Update user profile
    await user.update(value);

    // Fetch updated user with role
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'status']
      }]
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
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

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    // Validation
    const changePasswordSchema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(6).required()
    });

    const { error } = changePasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await user.update({ password: hashedNewPassword });

    // Log audit event for password change
    const ipAddress = getClientIP(req);
    await createAuditLog(userId, AuditActions.PASSWORD_CHANGED, TargetTypes.USER, userId, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
