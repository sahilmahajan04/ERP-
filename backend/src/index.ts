import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Route imports
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import salesRoutes from './routes/salesRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import manufacturingRoutes from './routes/manufacturingRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import userRoutes from './routes/userRoutes';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: '*', // Customize for production client domain
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Routing Mounts
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/purchase', purchaseRoutes);
app.use('/api/v1/manufacturing', manufacturingRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/users', userRoutes);


// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start listener
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Shiv Furniture Works ERP API running on port ${PORT}`);
  console.log(`🔗 Healthcheck available at: http://localhost:${PORT}/health`);
  console.log(`===================================================`);
});

export default app;
