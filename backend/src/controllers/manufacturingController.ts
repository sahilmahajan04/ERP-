import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../types';
import { createAuditLog } from '../services/auditLogService';

const MODULE = 'MANUFACTURING';

/**
 * List all Bills of Materials (BoMs)
 */
export const getBoms = async (req: Request, res: Response) => {
  try {
    const boms = await prisma.boM.findMany({
      where: { deletedAt: null },
      include: {
        product: { select: { sku: true, name: true } },
        components: {
          include: {
            product: { select: { sku: true, name: true } },
          },
        },
        operations: {
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(boms);
  } catch (error) {
    console.error('List BoMs error:', error);
    return res.status(500).json({ error: 'Internal server error listing Bills of Materials' });
  }
};

/**
 * Get BoM details by ID
 */
export const getBomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const bom = await prisma.boM.findFirst({
      where: { id, deletedAt: null },
      include: {
        product: { select: { sku: true, name: true } },
        components: {
          include: {
            product: { select: { sku: true, name: true } },
          },
        },
        operations: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!bom) {
      return res.status(404).json({ error: 'Bill of Materials not found' });
    }

    return res.status(200).json(bom);
  } catch (error) {
    console.error('Get BoM details error:', error);
    return res.status(500).json({ error: 'Internal server error fetching Bill of Materials details' });
  }
};

/**
 * Create a new Bill of Materials (BoM)
 */
export const createBom = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, name, version, components, operations } = req.body;

    const existingBom = await prisma.boM.findFirst({
      where: { productId, deletedAt: null },
    });

    if (existingBom) {
      return res.status(400).json({ error: 'A Bill of Materials already exists for this product' });
    }

    const bom = await prisma.$transaction(async (tx) => {
      const newBom = await tx.boM.create({
        data: {
          productId,
          name,
          version: version || '1.0.0',
          active: true,
        },
      });

      // Create BoM Components
      if (components && components.length > 0) {
        await tx.boMComponent.createMany({
          data: components.map((comp: any) => ({
            bomId: newBom.id,
            productId: comp.productId,
            quantity: comp.quantity,
          })),
        });
      }

      // Create BoM Operations
      if (operations && operations.length > 0) {
        await tx.boMOperation.createMany({
          data: operations.map((op: any) => ({
            bomId: newBom.id,
            name: op.name,
            workCenter: op.workCenter,
            sequence: op.sequence,
            durationMinutes: op.durationMinutes,
            description: op.description || null,
          })),
        });
      }

      return newBom;
    });

    // Fetch complete newly created BoM for audit details and response
    const completeBom = await prisma.boM.findUnique({
      where: { id: bom.id },
      include: {
        product: { select: { sku: true, name: true } },
      },
    });

    // Audit Log
    if (req.user && completeBom) {
      await createAuditLog({
        userId: req.user.id,
        action: 'CREATE_BOM',
        module: MODULE,
        newValue: JSON.stringify({ name: completeBom.name, product: completeBom.product.sku }),
        referenceId: completeBom.id,
      });
    }

    return res.status(201).json({
      message: 'Bill of Materials created successfully',
      bom: completeBom,
    });
  } catch (error) {
    console.error('Create BoM error:', error);
    return res.status(500).json({ error: 'Internal server error creating Bill of Materials' });
  }
};

/**
 * Update an existing Bill of Materials (BoM)
 */
export const updateBom = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, version, components, operations, active } = req.body;

    const currentBom = await prisma.boM.findFirst({
      where: { id, deletedAt: null },
    });

    if (!currentBom) {
      return res.status(404).json({ error: 'Bill of Materials not found' });
    }

    const updatedBom = await prisma.$transaction(async (tx) => {
      // 1. Update BoM Header
      const updated = await tx.boM.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          version: version !== undefined ? version : undefined,
          active: active !== undefined ? active : undefined,
        },
      });

      // 2. Update Components (Delete and re-insert)
      if (components) {
        await tx.boMComponent.deleteMany({ where: { bomId: id } });
        if (components.length > 0) {
          await tx.boMComponent.createMany({
            data: components.map((comp: any) => ({
              bomId: id,
              productId: comp.productId,
              quantity: comp.quantity,
            })),
          });
        }
      }

      // 3. Update Operations (Delete and re-insert)
      if (operations) {
        await tx.boMOperation.deleteMany({ where: { bomId: id } });
        if (operations.length > 0) {
          await tx.boMOperation.createMany({
            data: operations.map((op: any) => ({
              bomId: id,
              name: op.name,
              workCenter: op.workCenter,
              sequence: op.sequence,
              durationMinutes: op.durationMinutes,
              description: op.description || null,
            })),
          });
        }
      }

      return updated;
    });

    // Audit Log
    if (req.user) {
      const changes = {
        old: { name: currentBom.name, version: currentBom.version, active: currentBom.active },
        new: { name: updatedBom.name, version: updatedBom.version, active: updatedBom.active },
      };
      await createAuditLog({
        userId: req.user.id,
        action: 'UPDATE_BOM',
        module: MODULE,
        oldValue: JSON.stringify(changes.old),
        newValue: JSON.stringify(changes.new),
        referenceId: updatedBom.id,
      });
    }

    return res.status(200).json({
      message: 'Bill of Materials updated successfully',
      bom: updatedBom,
    });
  } catch (error) {
    console.error('Update BoM error:', error);
    return res.status(500).json({ error: 'Internal server error updating Bill of Materials' });
  }
};

/**
 * Soft-delete a Bill of Materials (BoM)
 */
export const deleteBom = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const bom = await prisma.boM.findFirst({
      where: { id, deletedAt: null },
    });

    if (!bom) {
      return res.status(404).json({ error: 'Bill of Materials not found' });
    }

    await prisma.boM.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit Log
    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        action: 'DELETE_BOM',
        module: MODULE,
        oldValue: JSON.stringify({ name: bom.name }),
        referenceId: bom.id,
      });
    }

    return res.status(200).json({ message: 'Bill of Materials deleted successfully' });
  } catch (error) {
    console.error('Delete BoM error:', error);
    return res.status(500).json({ error: 'Internal server error deleting Bill of Materials' });
  }
};
