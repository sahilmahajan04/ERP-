import { Request, Response } from 'express';
import { prisma } from '../config/db';

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const role = user?.role;

    const showAll = role === 'ADMIN' || role === 'BUSINESS_OWNER';
    const showSales = showAll || role === 'SALES_USER';
    const showPurchase = showAll || role === 'PURCHASE_USER';
    const showManufacturing = showAll || role === 'MANUFACTURING_USER';
    const showInventory = showAll || role === 'INVENTORY_MANAGER';

    // 1. Total Sales Orders
    let salesCount = 0;
    let salesSum: any = { _sum: { totalAmount: 0 } };
    if (showSales) {
      salesCount = await prisma.salesOrder.count();
      salesSum = await prisma.salesOrder.aggregate({
        _sum: { totalAmount: true },
      });
    }

    // 2. Pending Deliveries
    let pendingDeliveriesCount = 0;
    if (showSales) {
      pendingDeliveriesCount = await prisma.salesOrder.count({
        where: {
          status: { in: ['CONFIRMED', 'PARTIALLY_DELIVERED'] },
        },
      });
    }

    // 3. Total Purchase Orders
    let purchaseCount = 0;
    let purchaseSum: any = { _sum: { totalAmount: 0 } };
    if (showPurchase) {
      purchaseCount = await prisma.purchaseOrder.count();
      purchaseSum = await prisma.purchaseOrder.aggregate({
        _sum: { totalAmount: true },
      });
    }

    // 4. Active Manufacturing Orders
    let activeMOsCount = 0;
    if (showManufacturing) {
      activeMOsCount = await prisma.manufacturingOrder.count({
        where: {
          status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        },
      });
    }

    // 5. Inventory Value (Sum of onHand * costPrice)
    let totalInventoryValue = 0;
    if (showInventory) {
      const inventories = await prisma.inventory.findMany({
        include: {
          product: { select: { costPrice: true } },
        },
      });
      inventories.forEach((inv) => {
        totalInventoryValue += Number(inv.onHand) * Number(inv.product.costPrice);
      });
    }

    // 6. Low Stock Products (availableQty = onHand - reserved < 10)
    let lowStockAlerts: any[] = [];
    if (showInventory) {
      const rawInventories = await prisma.inventory.findMany({
        include: {
          product: { select: { sku: true, name: true } },
          warehouse: { select: { code: true } },
        },
      });
      lowStockAlerts = rawInventories
        .map((inv) => ({
          sku: inv.product.sku,
          name: inv.product.name,
          warehouse: inv.warehouse.code,
          onHand: Number(inv.onHand),
          reserved: Number(inv.reserved),
          available: Number(inv.onHand) - Number(inv.reserved),
        }))
        .filter((item) => item.available < 10);
    }

    // 7. Delayed Orders (CONFIRMED but older than 3 days)
    let delayedOrdersCount = 0;
    if (showSales) {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      delayedOrdersCount = await prisma.salesOrder.count({
        where: {
          status: { in: ['CONFIRMED', 'PARTIALLY_DELIVERED'] },
          createdAt: { lt: threeDaysAgo },
        },
      });
    }

    // 8. Recent Activities (last 10 audit logs)
    let recentLogs;
    if (showAll) {
      recentLogs = await prisma.auditLog.findMany({
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      });
    } else {
      let allowedModules: string[] = [];
      if (role === 'SALES_USER') allowedModules = ['SALES', 'CUSTOMER'];
      if (role === 'PURCHASE_USER') allowedModules = ['PURCHASE', 'VENDOR'];
      if (role === 'MANUFACTURING_USER') allowedModules = ['MANUFACTURING', 'BOM'];
      if (role === 'INVENTORY_MANAGER') allowedModules = ['INVENTORY', 'PRODUCT', 'WAREHOUSE'];

      recentLogs = await prisma.auditLog.findMany({
        where: {
          module: { in: allowedModules },
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      });
    }

    const activities = recentLogs.map((log) => ({
      id: log.id,
      user: `${log.user.firstName} ${log.user.lastName}`,
      action: log.action,
      module: log.module,
      timestamp: log.timestamp,
      referenceId: log.referenceId,
    }));

    return res.status(200).json({
      sales: {
        count: salesCount,
        totalAmount: Number(salesSum._sum.totalAmount || 0),
      },
      purchases: {
        count: purchaseCount,
        totalAmount: Number(purchaseSum._sum.totalAmount || 0),
      },
      pendingDeliveries: pendingDeliveriesCount,
      activeManufacturing: activeMOsCount,
      inventoryValue: totalInventoryValue,
      delayedOrders: delayedOrdersCount,
      lowStockCount: lowStockAlerts.length,
      lowStockProducts: lowStockAlerts,
      recentActivities: activities,
    });
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    return res.status(500).json({ error: 'Internal server error fetching dashboard analytics' });
  }
};

// Reports
export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const data = await prisma.salesOrder.findMany({
      include: {
        customer: { select: { name: true } },
        items: { include: { product: { select: { sku: true, name: true } } } },
      },
      orderBy: { orderDate: 'desc' },
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error('Sales report error:', error);
    return res.status(500).json({ error: 'Internal server error generating sales report' });
  }
};

export const getPurchaseReport = async (req: Request, res: Response) => {
  try {
    const data = await prisma.purchaseOrder.findMany({
      include: {
        vendor: { select: { name: true } },
        items: { include: { product: { select: { sku: true, name: true } } } },
      },
      orderBy: { orderDate: 'desc' },
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error('Purchase report error:', error);
    return res.status(500).json({ error: 'Internal server error generating purchase report' });
  }
};

export const getInventoryReport = async (req: Request, res: Response) => {
  try {
    const data = await prisma.inventory.findMany({
      include: {
        product: { include: { category: true, uom: true } },
        warehouse: true,
      },
      orderBy: { product: { sku: 'asc' } },
    });

    const formatted = data.map((inv) => ({
      sku: inv.product.sku,
      name: inv.product.name,
      category: inv.product.category.name,
      uom: inv.product.uom.code,
      warehouse: inv.warehouse.name,
      warehouseCode: inv.warehouse.code,
      onHand: Number(inv.onHand),
      reserved: Number(inv.reserved),
      available: Number(inv.onHand) - Number(inv.reserved),
      costPrice: Number(inv.product.costPrice),
      totalValue: Number(inv.onHand) * Number(inv.product.costPrice),
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Inventory report error:', error);
    return res.status(500).json({ error: 'Internal server error generating inventory report' });
  }
};

export const getManufacturingReport = async (req: Request, res: Response) => {
  try {
    const data = await prisma.manufacturingOrder.findMany({
      include: {
        product: { select: { sku: true, name: true } },
        bom: { select: { name: true } },
        warehouse: { select: { code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error('Manufacturing report error:', error);
    return res.status(500).json({ error: 'Internal server error generating manufacturing report' });
  }
};

export const getProcurementReport = async (req: Request, res: Response) => {
  try {
    const data = await prisma.procurementRequest.findMany({
      include: {
        product: { select: { sku: true, name: true } },
        salesOrder: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error('Procurement report error:', error);
    return res.status(500).json({ error: 'Internal server error generating procurement report' });
  }
};
