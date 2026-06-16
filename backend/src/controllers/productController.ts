import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../types';
import { createAuditLog } from '../services/auditLogService';

const MODULE = 'PRODUCT_CATALOG';

/**
 * GET / - List all active products
 */
export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: { select: { name: true } },
        uom: { select: { code: true } },
      },
      orderBy: { sku: 'asc' },
    });
    return res.status(200).json(products);
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({ error: 'Internal server error fetching products' });
  }
};

/**
 * POST / - Create a new product
 */
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { sku, name, description, salesPrice, costPrice, categoryId, uomId, procurementStrategy, procurementType, vendorId } = req.body;

    const existing = await prisma.product.findUnique({
      where: { sku },
    });

    if (existing) {
      return res.status(400).json({ error: `Product with SKU ${sku} already exists` });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        salesPrice,
        costPrice,
        categoryId,
        uomId,
        procurementStrategy,
        procurementType,
        vendorId: vendorId || null,
        active: true,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE_PRODUCT',
      module: MODULE,
      newValue: JSON.stringify(product),
      referenceId: product.id,
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({ error: 'Internal server error creating product' });
  }
};

/**
 * DELETE /:id - Soft delete/deactivate product
 */
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const current = await prisma.product.findUnique({
      where: { id },
    });

    if (!current) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DEACTIVATE_PRODUCT',
      module: MODULE,
      oldValue: JSON.stringify(current),
      newValue: JSON.stringify(updated),
      referenceId: updated.id,
    });

    return res.status(200).json({ message: 'Product deactivated successfully', product: updated });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ error: 'Internal server error deleting product' });
  }
};

/**
 * GET /categories - List all categories
 */
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
    });
    return res.status(200).json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ error: 'Internal server error fetching categories' });
  }
};

/**
 * POST /categories - Create a category
 */
export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, description } = req.body;

    const existing = await prisma.productCategory.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(400).json({ error: `Category with code ${code} already exists` });
    }

    const category = await prisma.productCategory.create({
      data: { name, code, description, active: true },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE_CATEGORY',
      module: MODULE,
      newValue: JSON.stringify(category),
      referenceId: category.id,
    });

    return res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({ error: 'Internal server error creating category' });
  }
};

/**
 * GET /uoms - List all Units of Measure
 */
export const getUoms = async (req: AuthRequest, res: Response) => {
  try {
    const uoms = await prisma.unitOfMeasure.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
    });
    return res.status(200).json(uoms);
  } catch (error) {
    console.error('Get Uoms error:', error);
    return res.status(500).json({ error: 'Internal server error fetching Uoms' });
  }
};

/**
 * POST /uoms - Create a Uom
 */
export const createUom = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code } = req.body;

    const existing = await prisma.unitOfMeasure.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(400).json({ error: `Unit of Measure with code ${code} already exists` });
    }

    const uom = await prisma.unitOfMeasure.create({
      data: { name, code, active: true },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE_UOM',
      module: MODULE,
      newValue: JSON.stringify(uom),
      referenceId: uom.id,
    });

    return res.status(201).json(uom);
  } catch (error) {
    console.error('Create Uom error:', error);
    return res.status(500).json({ error: 'Internal server error creating Uom' });
  }
};
