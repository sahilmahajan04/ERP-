import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../types';
import { createAuditLog } from '../services/auditLogService';

const MODULE = 'MANUFACTURING_MANAGEMENT';

/**
 * GET /boms - List all active Bills of Materials
 */
export const getBoms = async (req: AuthRequest, res: Response) => {
  try {
    const boms = await prisma.boM.findMany({
      where: { active: true },
      include: {
        product: { select: { sku: true, name: true } },
        components: {
          include: {
            product: { select: { sku: true, name: true } },
          },
        },
        operations: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(boms);
  } catch (error) {
    console.error('Get BoMs error:', error);
    return res.status(500).json({ error: 'Internal server error fetching BoMs' });
  }
};

/**
 * POST /boms - Create a new Bill of Materials
 */
export const createBom = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, name, version, components, operations } = req.body;

    const existing = await prisma.boM.findUnique({
      where: { productId },
    });

    if (existing) {
      return res.status(400).json({ error: 'A Bill of Materials already exists for this product' });
    }

    const bom = await prisma.$transaction(async (tx) => {
      const createdBom = await tx.boM.create({
        data: {
          productId,
          name,
          version: version || '1.0.0',
          active: true,
        },
      });

      // Create components
      if (components && components.length > 0) {
        await tx.boMComponent.createMany({
          data: components.map((c: any) => ({
            bomId: createdBom.id,
            productId: c.productId,
            quantity: c.quantity,
          })),
        });
      }

      // Create operations
      if (operations && operations.length > 0) {
        await tx.boMOperation.createMany({
          data: operations.map((o: any) => ({
            bomId: createdBom.id,
            name: o.name,
            workCenter: o.workCenter,
            sequence: o.sequence,
            durationMinutes: o.durationMinutes,
            description: o.description || null,
          })),
        });
      }

      return tx.boM.findUnique({
        where: { id: createdBom.id },
        include: {
          product: { select: { sku: true, name: true } },
          components: { include: { product: { select: { sku: true, name: true } } } },
          operations: true,
        },
      });
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE_BOM',
      module: MODULE,
      newValue: JSON.stringify(bom),
      referenceId: bom?.id,
    });

    return res.status(201).json(bom);
  } catch (error) {
    console.error('Create BoM error:', error);
    return res.status(500).json({ error: 'Internal server error creating BoM' });
  }
};
