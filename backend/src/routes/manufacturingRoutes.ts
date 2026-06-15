import { Router } from 'express';
import {
  getBoms,
  getBomById,
  createBom,
  updateBom,
  deleteBom,
} from '../controllers/manufacturingController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validator';
import { createBomSchema, bomComponentSchema, bomOperationSchema } from '../validation';
import { Role } from '@prisma/client';
import { z } from 'zod';

const router = Router();

// Schema for updating a BoM
const updateBomSchema = z.object({
  name: z.string().min(1).optional(),
  version: z.string().optional(),
  components: z.array(bomComponentSchema).optional(),
  operations: z.array(bomOperationSchema).optional(),
  active: z.boolean().optional(),
});

// BoM routes
router.get('/boms', authenticateToken, getBoms);
router.post(
  '/boms',
  authenticateToken,
  authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER, Role.MANUFACTURING_USER),
  validateBody(createBomSchema),
  createBom
);

router.get('/boms/:id', authenticateToken, getBomById);
router.put(
  '/boms/:id',
  authenticateToken,
  authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER, Role.MANUFACTURING_USER),
  validateBody(updateBomSchema),
  updateBom
);

router.delete(
  '/boms/:id',
  authenticateToken,
  authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER, Role.MANUFACTURING_USER),
  deleteBom
);

export default router;
