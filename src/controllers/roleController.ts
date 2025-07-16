import { Request, Response } from 'express';
import Joi from 'joi';
import db from '../models';
import { Op } from 'sequelize';
import { logAuditEvent, AuditActions, TargetTypes } from '../middleware/auditLogger';

const { Role, User } = db;

// Validation schemas
const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  status: Joi.string().valid('active', 'inactive').default('active')
});

const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  status: Joi.string().valid('active', 'inactive')
});

const getRolesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow(''),
  status: Joi.string().valid('active', 'inactive')
});

export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = createRoleSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { name, status } = value;

    // Check if role name already exists
    const existingRole = await Role.findOne({
      where: { name: { [Op.iLike]: name } }
    });

    if (existingRole) {
      res.status(400).json({
        success: false,
        message: 'Role name already exists'
      });
      return;
    }

    // Create role
    const role = await Role.create({
      name,
      status
    });

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.ROLE_CREATED,
      TargetTypes.ROLE,
      role.id
    );

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { role }
    });

  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const { error, value } = getRolesSchema.validate(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { page, limit, search, status } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    
    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }
    
    if (status) {
      whereClause.status = status;
    }

    // Fetch roles with pagination
    const { rows: roles, count: total } = await Role.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'users',
        attributes: ['id'],
        required: false
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    // Add user count to each role
    const rolesWithCount = roles.map((role: any) => ({
      ...role.toJSON(),
      userCount: role.users?.length || 0,
      users: undefined // Remove users array from response
    }));

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        roles: rolesWithCount,
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
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getRoleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Role ID is required'
      });
      return;
    }

    const role = await Role.findByPk(id, {
      include: [{
        model: User,
        as: 'users',
        attributes: ['id', 'firstName', 'lastName', 'username', 'status'],
        required: false
      }]
    });

    if (!role) {
      res.status(404).json({
        success: false,
        message: 'Role not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { role }
    });

  } catch (error) {
    console.error('Get role by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Role ID is required'
      });
      return;
    }

    // Validate request body
    const { error, value } = updateRoleSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const { name, status } = value;

    // Check if role exists
    const role = await Role.findByPk(id);
    if (!role) {
      res.status(404).json({
        success: false,
        message: 'Role not found'
      });
      return;
    }

    // Check if new name already exists (if name is being updated)
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({
        where: { 
          name: { [Op.iLike]: name },
          id: { [Op.ne]: id }
        }
      });

      if (existingRole) {
        res.status(400).json({
          success: false,
          message: 'Role name already exists'
        });
        return;
      }
    }

    // Update role
    await role.update(value);

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.ROLE_UPDATED,
      TargetTypes.ROLE,
      id
    );

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: { role }
    });

  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Role ID is required'
      });
      return;
    }

    const role = await Role.findByPk(id);
    if (!role) {
      res.status(404).json({
        success: false,
        message: 'Role not found'
      });
      return;
    }

    // Check if role has users assigned
    const userCount = await User.count({
      where: { roleId: id, status: 'active' }
    });

    if (userCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete role. ${userCount} active user(s) are assigned to this role.`
      });
      return;
    }

    // Soft delete by setting status to inactive
    await role.update({ status: 'inactive' });

    // Log audit event
    await logAuditEvent(
      (req as any).user?.userId,
      AuditActions.ROLE_DELETED,
      TargetTypes.ROLE,
      id
    );

    res.status(200).json({
      success: true,
      message: 'Role deactivated successfully'
    });

  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
