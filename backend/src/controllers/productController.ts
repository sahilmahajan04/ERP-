import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types';
import { createAuditLog } from '../services/auditLogService';

const MODULE = 'PRODUCT';

/**
 * List all products
 */
export const getProducts = async (req: Request, res: Response) => {
  try {
    const { search, categoryId, active } = req.query;

    const whereClause: any = {
      deletedAt: null,
    };

    if (search) {
      const searchStr = search as string;
      whereClause.OR = [
        { sku: { contains: searchStr, mode: 'insensitive' } },
        { name: { contains: searchStr, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      whereClause.categoryId = categoryId as string;
    }

    if (active !== undefined) {
      whereClause.active = active === 'true' || active === 'active';
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: { select: { name: true } },
        uom: { select: { code: true } },
      },
      orderBy: { sku: 'asc' },
    });

    return res.status(200).json(products);
  } catch (error) {
    console.error('List products error:', error);
    return res.status(500).json({ error: 'Internal server error listing products' });
  }
};

/**
 * Get product by ID
 */
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { name: true } },
        uom: { select: { code: true } },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error('Get product by id error:', error);
    return res.status(500).json({ error: 'Internal server error fetching product details' });
  }
};

/**
 * Create a new product and initialize stock ledger records in active warehouses
 */
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const {
      sku,
      name,
      description,
      salesPrice,
      costPrice,
      categoryId,
      uomId,
      procurementStrategy,
      procurementType,
      vendorId,
    } = req.body;

    const existingProduct = await prisma.product.findFirst({
      where: { sku, deletedAt: null },
    });

    if (existingProduct) {
      return res.status(400).json({ error: 'Product with this SKU already exists' });
    }

    // Use transaction to ensure both product and inventory records are created
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
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

      // Find all active warehouses
      const warehouses = await tx.warehouse.findMany({
        where: { active: true, deletedAt: null },
      });

      // Initialize inventory records for this product
      if (warehouses.length > 0) {
        await tx.inventory.createMany({
          data: warehouses.map((wh) => ({
            productId: product.id,
            warehouseId: wh.id,
            onHand: 0,
            reserved: 0,
          })),
        });
      }

      return product;
    });

    // Audit log
    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        action: 'CREATE_PRODUCT',
        module: MODULE,
        newValue: JSON.stringify({ sku: result.sku, name: result.name }),
        referenceId: result.id,
      });
    }

    return res.status(201).json({
      message: 'Product created successfully',
      product: result,
    });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({ error: 'Internal server error creating product' });
  }
};

/**
 * Update an existing product
 */
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      sku,
      name,
      description,
      salesPrice,
      costPrice,
      categoryId,
      uomId,
      procurementStrategy,
      procurementType,
      vendorId,
      active,
    } = req.body;

    const currentProduct = await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!currentProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (sku && sku !== currentProduct.sku) {
      const skuConflict = await prisma.product.findFirst({
        where: { sku, deletedAt: null },
      });
      if (skuConflict) {
        return res.status(400).json({ error: 'Product with this SKU already exists' });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        sku: sku !== undefined ? sku : undefined,
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        salesPrice: salesPrice !== undefined ? salesPrice : undefined,
        costPrice: costPrice !== undefined ? costPrice : undefined,
        categoryId: categoryId !== undefined ? categoryId : undefined,
        uomId: uomId !== undefined ? uomId : undefined,
        procurementStrategy: procurementStrategy !== undefined ? procurementStrategy : undefined,
        procurementType: procurementType !== undefined ? procurementType : undefined,
        vendorId: vendorId !== undefined ? (vendorId || null) : undefined,
        active: active !== undefined ? active : undefined,
      },
    });

    // Audit Log
    if (req.user) {
      const changes = {
        old: { sku: currentProduct.sku, name: currentProduct.name, active: currentProduct.active },
        new: { sku: updatedProduct.sku, name: updatedProduct.name, active: updatedProduct.active },
      };
      await createAuditLog({
        userId: req.user.id,
        action: 'UPDATE_PRODUCT',
        module: MODULE,
        oldValue: JSON.stringify(changes.old),
        newValue: JSON.stringify(changes.new),
        referenceId: updatedProduct.id,
      });
    }

    return res.status(200).json({
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ error: 'Internal server error updating product' });
  }
};

/**
 * Soft-delete a product
 */
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit Log
    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        action: 'DELETE_PRODUCT',
        module: MODULE,
        oldValue: JSON.stringify({ sku: product.sku, name: product.name }),
        referenceId: product.id,
      });
    }

    return res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ error: 'Internal server error deleting product' });
  }
};

/**
 * List categories
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json(categories);
  } catch (error) {
    console.error('List categories error:', error);
    return res.status(500).json({ error: 'Internal server error listing categories' });
  }
};

/**
 * Create a category
 */
export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, description } = req.body;

    const existingCategory = await prisma.productCategory.findFirst({
      where: { code, deletedAt: null },
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category with this code already exists' });
    }

    const category = await prisma.productCategory.create({
      data: { name, code, description },
    });

    // Audit Log
    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        action: 'CREATE_PRODUCT_CATEGORY',
        module: MODULE,
        newValue: JSON.stringify({ code: category.code, name: category.name }),
        referenceId: category.id,
      });
    }

    return res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({ error: 'Internal server error creating category' });
  }
};

/**
 * List units of measure
 */
export const getUoms = async (req: Request, res: Response) => {
  try {
    const uoms = await prisma.unitOfMeasure.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json(uoms);
  } catch (error) {
    console.error('List UoMs error:', error);
    return res.status(500).json({ error: 'Internal server error listing units of measure' });
  }
};

/**
 * Create a unit of measure
 */
export const createUom = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code } = req.body;

    const existingUom = await prisma.unitOfMeasure.findFirst({
      where: { code, deletedAt: null },
    });

    if (existingUom) {
      return res.status(400).json({ error: 'Unit of measure with this code already exists' });
    }

    const uom = await prisma.unitOfMeasure.create({
      data: { name, code },
    });

    // Audit Log
    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        action: 'CREATE_UOM',
        module: MODULE,
        newValue: JSON.stringify({ code: uom.code, name: uom.name }),
        referenceId: uom.id,
      });
    }

    return res.status(201).json(uom);
  } catch (error) {
    console.error('Create UoM error:', error);
    return res.status(500).json({ error: 'Internal server error creating unit of measure' });
  }
};
