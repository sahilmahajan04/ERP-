import { Response } from 'express';
import { prisma } from '../config/db';
import { Role, StockMovementType } from '@prisma/client';
import { AuthRequest } from '../types';
import { createAuditLog } from '../services/auditLogService';

const MODULE = 'INVENTORY_MANAGEMENT';

/**
 * GET / - List all inventory stock levels
 */
export const getInventoryLevels = async (req: AuthRequest, res: Response) => {
  try {
    const { warehouseId, productId, search } = req.query;
    const whereClause: any = {};

    if (warehouseId) {
      whereClause.warehouseId = warehouseId as string;
    }
    if (productId) {
      whereClause.productId = productId as string;
    }
    if (search) {
      const searchStr = search as string;
      whereClause.product = {
        OR: [
          { name: { contains: searchStr, mode: 'insensitive' } },
          { sku: { contains: searchStr, mode: 'insensitive' } },
        ],
      };
    }

    const inventories = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            sku: true,
            name: true,
            costPrice: true,
            category: { select: { name: true } },
            uom: { select: { code: true } },
          },
        },
        warehouse: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { product: { sku: 'asc' } },
    });

    const formatted = inventories.map((inv) => {
      const onHand = Number(inv.onHand);
      const reserved = Number(inv.reserved);
      return {
        id: inv.id,
        productId: inv.productId,
        productName: inv.product.name,
        sku: inv.product.sku,
        category: inv.product.category.name,
        uom: inv.product.uom.code,
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
        warehouseCode: inv.warehouse.code,
        onHand,
        reserved,
        availableQty: onHand - reserved,
        updatedAt: inv.updatedAt.toISOString(),
      };
    });

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Get inventory levels error:', error);
    return res.status(500).json({ error: 'Internal server error fetching inventory levels' });
  }
};

/**
 * GET /warehouses - List all active/all warehouses
 */
export const getWarehouses = async (req: AuthRequest, res: Response) => {
  try {
    const { activeOnly } = req.query;
    const whereClause: any = {};

    if (activeOnly === 'true') {
      whereClause.active = true;
    }

    const warehouses = await prisma.warehouse.findMany({
      where: whereClause,
      orderBy: { code: 'asc' },
    });

    return res.status(200).json(warehouses);
  } catch (error) {
    console.error('Get warehouses error:', error);
    return res.status(500).json({ error: 'Internal server error fetching warehouses' });
  }
};

/**
 * POST /warehouses - Create a new warehouse (Admin, Business Owner, Inventory Manager)
 */
export const createWarehouse = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, address } = req.body;

    const existing = await prisma.warehouse.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(400).json({ error: `Warehouse with code ${code} already exists` });
    }

    const warehouse = await prisma.warehouse.create({
      data: { name, code, address, active: true },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE_WAREHOUSE',
      module: MODULE,
      newValue: JSON.stringify(warehouse),
      referenceId: warehouse.id,
    });

    return res.status(201).json(warehouse);
  } catch (error) {
    console.error('Create warehouse error:', error);
    return res.status(500).json({ error: 'Internal server error creating warehouse' });
  }
};

/**
 * PUT /warehouses/:id - Update warehouse (Admin, Business Owner, Inventory Manager)
 */
export const updateWarehouse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, address, active } = req.body;

    const current = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!current) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    if (code && code !== current.code) {
      const existing = await prisma.warehouse.findUnique({
        where: { code },
      });
      if (existing) {
        return res.status(400).json({ error: `Warehouse with code ${code} already exists` });
      }
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: { name, code, address, active },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_WAREHOUSE',
      module: MODULE,
      oldValue: JSON.stringify(current),
      newValue: JSON.stringify(updated),
      referenceId: updated.id,
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Update warehouse error:', error);
    return res.status(500).json({ error: 'Internal server error updating warehouse' });
  }
};

/**
 * DELETE /warehouses/:id - Soft-delete/deactivate warehouse (Admin, Business Owner, Inventory Manager)
 */
export const deleteWarehouse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const current = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!current) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DEACTIVATE_WAREHOUSE',
      module: MODULE,
      oldValue: JSON.stringify(current),
      newValue: JSON.stringify(updated),
      referenceId: updated.id,
    });

    return res.status(200).json({ message: 'Warehouse deactivated successfully', warehouse: updated });
  } catch (error) {
    console.error('Deactivate warehouse error:', error);
    return res.status(500).json({ error: 'Internal server error deactivating warehouse' });
  }
};

/**
 * GET /ledger - Get paginated Stock Ledger Movements log
 */
export const getStockLedger = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, warehouseId, limit = '50', page = '1' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};
    if (productId) whereClause.productId = productId as string;
    if (warehouseId) whereClause.warehouseId = warehouseId as string;

    const [logs, total] = await prisma.$transaction([
      prisma.stockLedger.findMany({
        where: whereClause,
        include: {
          product: { select: { sku: true, name: true } },
          warehouse: { select: { name: true, code: true } },
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.stockLedger.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      data: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get stock ledger error:', error);
    return res.status(500).json({ error: 'Internal server error fetching stock ledger log' });
  }
};

/**
 * POST /adjust - Manual inventory stock level adjustments (Prevents negative stock)
 */
export const adjustInventory = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, warehouseId, adjustmentQty, reason } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Find or create inventory record
      let inventory = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
      });

      const currentOnHand = inventory ? Number(inventory.onHand) : 0;
      const currentReserved = inventory ? Number(inventory.reserved) : 0;
      const newOnHand = currentOnHand + adjustmentQty;

      if (newOnHand < 0) {
        throw new Error('NEGATIVE_STOCK_NOT_ALLOWED');
      }

      if (newOnHand < currentReserved) {
        throw new Error('STOCK_BELOW_RESERVED_NOT_ALLOWED');
      }

      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            productId,
            warehouseId,
            onHand: newOnHand,
            reserved: 0,
          },
        });
      } else {
        inventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: { onHand: newOnHand },
        });
      }

      // Record StockLedger movement
      const ledgerEntry = await tx.stockLedger.create({
        data: {
          productId,
          warehouseId,
          quantity: adjustmentQty,
          movementType: StockMovementType.INVENTORY_ADJUSTMENT,
          reference: `ADJUSTMENT: ${reason}`,
          userId: req.user!.id,
        },
      });

      return { inventory, ledgerEntry };
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'ADJUST_INVENTORY',
      module: MODULE,
      newValue: JSON.stringify({
        productId,
        warehouseId,
        adjustmentQty,
        reason,
        newOnHand: Number(result.inventory.onHand),
      }),
      referenceId: result.inventory.id,
    });

    return res.status(200).json({
      message: 'Inventory adjusted successfully',
      inventory: result.inventory,
      ledgerEntry: result.ledgerEntry,
    });
  } catch (error: any) {
    console.error('Adjust inventory error:', error);
    if (error.message === 'NEGATIVE_STOCK_NOT_ALLOWED') {
      return res.status(400).json({ error: 'Adjustment rejected: Physical stock on-hand cannot go below 0' });
    }
    if (error.message === 'STOCK_BELOW_RESERVED_NOT_ALLOWED') {
      return res.status(400).json({ error: 'Adjustment rejected: Physical stock on-hand cannot go below reserved amount' });
    }
    return res.status(500).json({ error: 'Internal server error adjusting inventory' });
  }
};

/**
 * POST /transfer - Transfer stock between warehouses (Prevents negative stock)
 */
export const transferInventory = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, srcWarehouseId, destWarehouseId, quantity, reason } = req.body;

    if (srcWarehouseId === destWarehouseId) {
      return res.status(400).json({ error: 'Source and destination warehouses cannot be the same' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get source inventory
      const srcInventory = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId, warehouseId: srcWarehouseId } },
      });

      if (!srcInventory) {
        throw new Error('SRC_INVENTORY_NOT_FOUND');
      }

      const srcOnHand = Number(srcInventory.onHand);
      const srcReserved = Number(srcInventory.reserved);
      const srcAvailable = srcOnHand - srcReserved;

      if (srcAvailable < quantity) {
        throw new Error('INSUFFICIENT_STOCK_FOR_TRANSFER');
      }

      // Get destination warehouse code for references
      const srcWh = await tx.warehouse.findUnique({ where: { id: srcWarehouseId } });
      const destWh = await tx.warehouse.findUnique({ where: { id: destWarehouseId } });

      if (!srcWh || !destWh) {
        throw new Error('WAREHOUSE_NOT_FOUND');
      }

      // Update source inventory
      const updatedSrc = await tx.inventory.update({
        where: { id: srcInventory.id },
        data: { onHand: srcOnHand - quantity },
      });

      // Find or create destination inventory
      let destInventory = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId, warehouseId: destWarehouseId } },
      });

      if (!destInventory) {
        destInventory = await tx.inventory.create({
          data: {
            productId,
            warehouseId: destWarehouseId,
            onHand: quantity,
            reserved: 0,
          },
        });
      } else {
        destInventory = await tx.inventory.update({
          where: { id: destInventory.id },
          data: { onHand: Number(destInventory.onHand) + quantity },
        });
      }

      // Create ledger logs
      const outLedger = await tx.stockLedger.create({
        data: {
          productId,
          warehouseId: srcWarehouseId,
          quantity: -quantity,
          movementType: StockMovementType.INVENTORY_ADJUSTMENT,
          reference: `TRANSFER_OUT: to ${destWh.code} - ${reason}`,
          userId: req.user!.id,
        },
      });

      const inLedger = await tx.stockLedger.create({
        data: {
          productId,
          warehouseId: destWarehouseId,
          quantity: quantity,
          movementType: StockMovementType.INVENTORY_ADJUSTMENT,
          reference: `TRANSFER_IN: from ${srcWh.code} - ${reason}`,
          userId: req.user!.id,
        },
      });

      return { updatedSrc, destInventory, outLedger, inLedger, srcCode: srcWh.code, destCode: destWh.code };
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'TRANSFER_INVENTORY',
      module: MODULE,
      newValue: JSON.stringify({
        productId,
        srcWarehouseId,
        destWarehouseId,
        quantity,
        reason,
      }),
      referenceId: result.updatedSrc.id,
    });

    return res.status(200).json({
      message: `Stock transferred successfully from ${result.srcCode} to ${result.destCode}`,
      sourceInventory: result.updatedSrc,
      destinationInventory: result.destInventory,
    });
  } catch (error: any) {
    console.error('Transfer inventory error:', error);
    if (error.message === 'SRC_INVENTORY_NOT_FOUND' || error.message === 'INSUFFICIENT_STOCK_FOR_TRANSFER') {
      return res.status(400).json({ error: 'Transfer rejected: Insufficient available stock in source warehouse' });
    }
    if (error.message === 'WAREHOUSE_NOT_FOUND') {
      return res.status(404).json({ error: 'Transfer rejected: Warehouse not found' });
    }
    return res.status(500).json({ error: 'Internal server error executing transfer' });
  }
};

/**
 * POST /stock-in - Record Stock In movement (manual)
 */
export const stockIn = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, warehouseId, quantity, reason } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      let inventory = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
      });

      const currentOnHand = inventory ? Number(inventory.onHand) : 0;
      const newOnHand = currentOnHand + quantity;

      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            productId,
            warehouseId,
            onHand: newOnHand,
            reserved: 0,
          },
        });
      } else {
        inventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: { onHand: newOnHand },
        });
      }

      const ledgerEntry = await tx.stockLedger.create({
        data: {
          productId,
          warehouseId,
          quantity,
          movementType: StockMovementType.INVENTORY_ADJUSTMENT,
          reference: `STOCK_IN: ${reason}`,
          userId: req.user!.id,
        },
      });

      return { inventory, ledgerEntry };
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'STOCK_IN',
      module: MODULE,
      newValue: JSON.stringify({ productId, warehouseId, quantity, reason }),
      referenceId: result.inventory.id,
    });

    return res.status(200).json({
      message: 'Stock In completed successfully',
      inventory: result.inventory,
      ledgerEntry: result.ledgerEntry,
    });
  } catch (error) {
    console.error('Stock in error:', error);
    return res.status(500).json({ error: 'Internal server error performing Stock In' });
  }
};

/**
 * POST /stock-out - Record Stock Out movement (manual, prevents negative stock)
 */
export const stockOut = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, warehouseId, quantity, reason } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
      });

      if (!inventory) {
        throw new Error('INVENTORY_NOT_FOUND');
      }

      const currentOnHand = Number(inventory.onHand);
      const currentReserved = Number(inventory.reserved);
      const available = currentOnHand - currentReserved;

      if (available < quantity) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      const updatedInventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: { onHand: currentOnHand - quantity },
      });

      const ledgerEntry = await tx.stockLedger.create({
        data: {
          productId,
          warehouseId,
          quantity: -quantity,
          movementType: StockMovementType.INVENTORY_ADJUSTMENT,
          reference: `STOCK_OUT: ${reason}`,
          userId: req.user!.id,
        },
      });

      return { inventory: updatedInventory, ledgerEntry };
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'STOCK_OUT',
      module: MODULE,
      newValue: JSON.stringify({ productId, warehouseId, quantity, reason }),
      referenceId: result.inventory.id,
    });

    return res.status(200).json({
      message: 'Stock Out completed successfully',
      inventory: result.inventory,
      ledgerEntry: result.ledgerEntry,
    });
  } catch (error: any) {
    console.error('Stock out error:', error);
    if (error.message === 'INVENTORY_NOT_FOUND' || error.message === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({ error: 'Stock Out rejected: Insufficient stock available in warehouse' });
    }
    return res.status(500).json({ error: 'Internal server error performing Stock Out' });
  }
};

/**
 * GET /dashboard-metrics - Get dashboard-level summary indicators
 */
export const getInventoryMetrics = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Warehouse counts
    const warehouseCount = await prisma.warehouse.count({ where: { active: true } });

    // 2. Total items (products with active records)
    const productCount = await prisma.product.count({ where: { active: true } });

    // 3. Inventory valuation & total items
    const inventories = await prisma.inventory.findMany({
      include: { product: { select: { costPrice: true } } },
    });

    let totalValuation = 0;
    let totalOnHand = 0;
    inventories.forEach((inv) => {
      totalValuation += Number(inv.onHand) * Number(inv.product.costPrice);
      totalOnHand += Number(inv.onHand);
    });

    // 4. Low stock alerts
    const lowStockAlerts = inventories
      .map((inv) => ({
        available: Number(inv.onHand) - Number(inv.reserved),
      }))
      .filter((item) => item.available < 10).length;

    return res.status(200).json({
      totalValuation,
      totalOnHand,
      warehouseCount,
      totalItems: productCount,
      lowStockAlerts,
    });
  } catch (error) {
    console.error('Get inventory metrics error:', error);
    return res.status(500).json({ error: 'Internal server error fetching inventory metrics' });
  }
};
