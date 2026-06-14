import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  updateUserPassword,
  updateUserRole,
  getMe,
} from '../controllers/userController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validator';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
  changePasswordSchema,
} from '../validation';
import { Role } from '@prisma/client';

const router = Router();

// Get current user profile (Must be defined BEFORE /:id so it does not capture 'profile' as id param)
router.get('/profile/me', authenticateToken, getMe);

// List users (Admin only)
router.get('/', authenticateToken, authorizeRoles(Role.ADMIN), getUsers);

// Get user by ID (Admin or own profile)
router.get('/:id', authenticateToken, getUserById);

// Create user (Admin only)
router.post('/', authenticateToken, authorizeRoles(Role.ADMIN), validateBody(createUserSchema), createUser);

// Update user details (Admin or own profile)
router.put('/:id', authenticateToken, validateBody(updateUserSchema), updateUser);

// Toggle active status (Admin only)
router.patch('/:id/status', authenticateToken, authorizeRoles(Role.ADMIN), validateBody(updateUserStatusSchema), updateUserStatus);

// Change password (Admin or own profile)
router.patch('/:id/password', authenticateToken, validateBody(changePasswordSchema), updateUserPassword);

// Change role (Admin only)
router.patch('/:id/role', authenticateToken, authorizeRoles(Role.ADMIN), validateBody(updateUserRoleSchema), updateUserRole);

export default router;
