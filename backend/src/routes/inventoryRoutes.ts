import { Router } from 'express';
import {
  getInventoryLevels,
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getStockLedger,
  adjustInventory,
  transferInventory,
  stockIn,
  stockOut,
  getInventoryMetrics,
} from '../controllers/inventoryController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validator';
import {
  adjustInventorySchema,
  transferInventorySchema,
  stockInSchema,
  stockOutSchema,
  createWarehouseSchema,
} from '../validation';
import { Role } from '@prisma/client';

const router = Router();

// Read operations - Allowed for all authenticated users in dashboard layout
router.get('/', authenticateToken, getInventoryLevels);
router.get('/warehouses', authenticateToken, getWarehouses);
router.get('/ledger', authenticateToken, getStockLedger);
router.get('/dashboard-metrics', authenticateToken, getInventoryMetrics);

// Write operations - Limited to ADMIN, BUSINESS_OWNER, INVENTORY_MANAGER
const writeRoles = authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER, Role.INVENTORY_MANAGER);

router.post('/warehouses', authenticateToken, writeRoles, validateBody(createWarehouseSchema), createWarehouse);
router.put('/warehouses/:id', authenticateToken, writeRoles, validateBody(createWarehouseSchema), updateWarehouse);
router.delete('/warehouses/:id', authenticateToken, writeRoles, deleteWarehouse);

router.post('/adjust', authenticateToken, writeRoles, validateBody(adjustInventorySchema), adjustInventory);
router.post('/transfer', authenticateToken, writeRoles, validateBody(transferInventorySchema), transferInventory);
router.post('/stock-in', authenticateToken, writeRoles, validateBody(stockInSchema), stockIn);
router.post('/stock-out', authenticateToken, writeRoles, validateBody(stockOutSchema), stockOut);

export default router;
