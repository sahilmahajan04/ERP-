import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../types';

/**
 * GET /vendors - List all active vendors
 */
export const getVendors = async (req: AuthRequest, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json(vendors);
  } catch (error) {
    console.error('Get vendors error:', error);
    return res.status(500).json({ error: 'Internal server error fetching vendors' });
  }
};
