import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../models';

const { User, Role } = db;

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-here';
    
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Check if user still exists and is active
    const user = await User.findByPk(decoded.userId, {
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'status']
      }]
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
      return;
    }

    // Add user info to request object
    (req as any).user = {
      userId: user.id,
      username: user.username,
      roleId: user.roleId,
      role: user.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired'
      });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const authorizeRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    if (!allowedRoles.includes(user.role?.name)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};
