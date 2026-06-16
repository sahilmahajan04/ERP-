import { Router } from 'express';
import {
  getProducts,
  createProduct,
  deleteProduct,
  getCategories,
  createCategory,
  getUoms,
  createUom,
} from '../controllers/productController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validator';
import {
  createProductSchema,
  createCategorySchema,
  createUomSchema,
} from '../validation';
import { Role } from '@prisma/client';

const router = Router();

// Read operations - Allowed for all authenticated users
router.get('/', authenticateToken, getProducts);
router.get('/categories', authenticateToken, getCategories);
router.get('/uoms', authenticateToken, getUoms);

// Write operations - Limited to ADMIN and BUSINESS_OWNER
const adminOrOwner = authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER);

router.post('/', authenticateToken, adminOrOwner, validateBody(createProductSchema), createProduct);
router.delete('/:id', authenticateToken, adminOrOwner, deleteProduct);

router.post('/categories', authenticateToken, adminOrOwner, validateBody(createCategorySchema), createCategory);
router.post('/uoms', authenticateToken, adminOrOwner, validateBody(createUomSchema), createUom);

export default router;
