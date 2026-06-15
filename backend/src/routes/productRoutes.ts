import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
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
  updateProductSchema,
  createCategorySchema,
  createUomSchema,
} from '../validation';
import { Role } from '@prisma/client';

const router = Router();

// Category routes
router.get('/categories', authenticateToken, getCategories);
router.post(
  '/categories',
  authenticateToken,
  authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER, Role.INVENTORY_MANAGER),
  validateBody(createCategorySchema),
  createCategory
);

// UoM routes
router.get('/uoms', authenticateToken, getUoms);
router.post(
  '/uoms',
  authenticateToken,
  authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER, Role.INVENTORY_MANAGER),
  validateBody(createUomSchema),
  createUom
);

// Product CRUD routes
router.get('/', authenticateToken, getProducts);
router.post(
  '/',
  authenticateToken,
  authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER, Role.INVENTORY_MANAGER),
  validateBody(createProductSchema),
  createProduct
);

router.get('/:id', authenticateToken, getProductById);
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER, Role.INVENTORY_MANAGER),
  validateBody(updateProductSchema),
  updateProduct
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER, Role.INVENTORY_MANAGER),
  deleteProduct
);

export default router;
