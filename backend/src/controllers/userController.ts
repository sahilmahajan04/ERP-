import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types';
import { createAuditLog } from '../services/auditLogService';

// Module string for audit logs
const MODULE = 'USER_MANAGEMENT';

/**
 * List all users (Admin only)
 */
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== Role.ADMIN) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    const { search, role, status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    // Search filter (email, first name, last name)
    if (search) {
      const searchStr = search as string;
      whereClause.OR = [
        { email: { contains: searchStr, mode: 'insensitive' } },
        { firstName: { contains: searchStr, mode: 'insensitive' } },
        { lastName: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    // Role filter
    if (role && Object.values(Role).includes(role as Role)) {
      whereClause.role = role as Role;
    }

    // Status filter
    if (status !== undefined) {
      if (status === 'true' || status === 'active') {
        whereClause.active = true;
      } else if (status === 'false' || status === 'inactive') {
        whereClause.active = false;
      }
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Internal server error listing users' });
  }
};

/**
 * Get user details by ID
 */
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Non-admin can only view their own profile details
    if (req.user?.role !== Role.ADMIN && req.user?.id !== id) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Get user details error:', error);
    return res.status(500).json({ error: 'Internal server error fetching user details' });
  }
};

/**
 * Create a new user (Admin only)
 */
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== Role.ADMIN) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    const { email, password, firstName, lastName, role } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: role as Role,
        active: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    // Audit Log
    await createAuditLog({
      userId: req.user.id,
      action: 'CREATE_USER',
      module: MODULE,
      newValue: JSON.stringify({ email: user.email, role: user.role }),
      referenceId: user.id,
    });

    return res.status(201).json({
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Internal server error creating user' });
  }
};

/**
 * Update user details
 */
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName } = req.body;

    // Non-admin can only update their own profile
    if (req.user?.role !== Role.ADMIN && req.user?.id !== id) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    // Retrieve current user state for audit log comparison
    const currentUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check email uniqueness if email is changed
    if (email && email !== currentUser.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email },
      });
      if (emailConflict) {
        return res.status(400).json({ error: 'Email already in use by another user' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email: email || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
      },
    });

    // Audit Log
    const changes = {
      old: { email: currentUser.email, firstName: currentUser.firstName, lastName: currentUser.lastName },
      new: { email: updatedUser.email, firstName: updatedUser.firstName, lastName: updatedUser.lastName },
    };

    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_USER',
      module: MODULE,
      oldValue: JSON.stringify(changes.old),
      newValue: JSON.stringify(changes.new),
      referenceId: updatedUser.id,
    });

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Internal server error updating user' });
  }
};

/**
 * Update user status (Admin only)
 */
export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== Role.ADMIN) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    const { id } = req.params;
    const { active } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { active },
      select: {
        id: true,
        email: true,
        active: true,
      },
    });

    // If deactivated, revoke all refresh tokens so the user is signed out
    if (!active) {
      await prisma.refreshToken.updateMany({
        where: { userId: id },
        data: { revoked: true },
      });
    }

    // Audit Log
    await createAuditLog({
      userId: req.user.id,
      action: active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      module: MODULE,
      oldValue: JSON.stringify({ active: user.active }),
      newValue: JSON.stringify({ active: updatedUser.active }),
      referenceId: updatedUser.id,
    });

    return res.status(200).json({
      message: `User ${active ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return res.status(500).json({ error: 'Internal server error updating user status' });
  }
};

/**
 * Change / Reset user password
 */
export const updateUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Non-admin can only change their own password
    if (req.user?.role !== Role.ADMIN && req.user?.id !== id) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Non-admins must verify their current password first
    if (req.user?.role !== Role.ADMIN) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Revoke current refresh tokens so they must re-log in with new password
    await prisma.refreshToken.updateMany({
      where: { userId: id },
      data: { revoked: true },
    });

    // Audit Log
    await createAuditLog({
      userId: req.user.id,
      action: 'CHANGE_PASSWORD',
      module: MODULE,
      referenceId: user.id,
    });

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ error: 'Internal server error updating password' });
  }
};

/**
 * Assign user role (Admin only)
 */
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== Role.ADMIN) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!Object.values(Role).includes(role as Role)) {
      return res.status(400).json({ error: 'Invalid user role' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    // Audit Log
    await createAuditLog({
      userId: req.user.id,
      action: 'ASSIGN_ROLE',
      module: MODULE,
      oldValue: JSON.stringify({ role: user.role }),
      newValue: JSON.stringify({ role: updatedUser.role }),
      referenceId: updatedUser.id,
    });

    return res.status(200).json({
      message: 'Role updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user role error:', error);
    return res.status(500).json({ error: 'Internal server error updating user role' });
  }
};

/**
 * Get current profile (Me)
 */
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Get profile me error:', error);
    return res.status(500).json({ error: 'Internal server error fetching user profile' });
  }
};
