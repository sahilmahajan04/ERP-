import { z } from 'zod';
import { Role, ProcurementStrategy, ProcurementType, WorkCenter } from '@prisma/client';

// Auth Validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(Role),
});

// Category and UoM
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  description: z.string().optional(),
});

export const createUomSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
});

// Warehouse
export const createWarehouseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  address: z.string().optional(),
});

// Product
export const createProductSchema = z.object({
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  salesPrice: z.number().positive('Sales price must be positive'),
  costPrice: z.number().positive('Cost price must be positive'),
  categoryId: z.string().uuid('Invalid category ID'),
  uomId: z.string().uuid('Invalid UoM ID'),
  procurementStrategy: z.nativeEnum(ProcurementStrategy),
  procurementType: z.nativeEnum(ProcurementType),
  vendorId: z.string().uuid('Invalid Vendor ID').nullable().optional(),
});

export const updateProductSchema = createProductSchema.partial();

// Sales Order
export const salesOrderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  warehouseId: z.string().uuid('Invalid warehouse ID'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
});

export const createSalesOrderSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z.array(salesOrderItemSchema).min(1, 'Order must contain at least one item'),
});

// Purchase Order
export const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  warehouseId: z.string().uuid('Invalid warehouse ID'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().uuid('Invalid vendor ID'),
  items: z.array(purchaseOrderItemSchema).min(1, 'Order must contain at least one item'),
});

// Goods receipt
export const receiveItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be greater than 0'),
});

export const receivePurchaseOrderSchema = z.object({
  items: z.array(receiveItemSchema).min(1, 'Must receive at least one item'),
});

// Deliveries
export const deliverItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be greater than 0'),
});

export const deliverSalesOrderSchema = z.object({
  items: z.array(deliverItemSchema).min(1, 'Must deliver at least one item'),
});

// Bill of Materials
export const bomComponentSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be positive'),
});

export const bomOperationSchema = z.object({
  name: z.string().min(1, 'Operation name is required'),
  workCenter: z.nativeEnum(WorkCenter),
  sequence: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  description: z.string().optional(),
});

export const createBomSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1),
  version: z.string().optional(),
  components: z.array(bomComponentSchema).min(1, 'BoM must contain components'),
  operations: z.array(bomOperationSchema).min(1, 'BoM must outline operations'),
});

// Manufacturing Order
export const createManufacturingOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  bomId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable().optional(),
});
