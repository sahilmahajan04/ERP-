import { Router } from 'express';
import { register, login, refresh, logout, getMe } from '../controllers/authController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validator';
import { registerSchema, loginSchema } from '../validation';
import { Role } from '@prisma/client';

const router = Router();

router.post('/register', authenticateToken, authorizeRoles(Role.ADMIN), validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticateToken, getMe);

export default router;
