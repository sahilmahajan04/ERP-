import { Router } from 'express';
import { getBoms, createBom } from '../controllers/manufacturingController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validator';
import { createBomSchema } from '../validation';
import { Role } from '@prisma/client';

const router = Router();

// Read BoMs - all authenticated users can view
router.get('/boms', authenticateToken, getBoms);

// Create BoM - ADMIN, BUSINESS_OWNER
router.post(
  '/boms',
  authenticateToken,
  authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER),
  validateBody(createBomSchema),
  createBom
);

export default router;
