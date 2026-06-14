import { Router } from 'express';
import {
  getDashboardMetrics,
  getSalesReport,
  getPurchaseReport,
  getInventoryReport,
  getManufacturingReport,
  getProcurementReport,
} from '../controllers/dashboardController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Dashboard general metrics card
router.get('/metrics', authenticateToken, authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER), getDashboardMetrics);

// Reports
router.get('/reports/sales', authenticateToken, authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER), getSalesReport);
router.get('/reports/purchase', authenticateToken, authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER), getPurchaseReport);
router.get('/reports/inventory', authenticateToken, authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER, Role.INVENTORY_MANAGER), getInventoryReport);
router.get('/reports/manufacturing', authenticateToken, authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER), getManufacturingReport);
router.get('/reports/procurement', authenticateToken, authorizeRoles(Role.ADMIN, Role.BUSINESS_OWNER), getProcurementReport);

export default router;
