import { Router } from 'express';
import { getVendors } from '../controllers/purchaseController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/vendors', authenticateToken, getVendors);

export default router;
