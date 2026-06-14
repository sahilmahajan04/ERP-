import { prisma } from '../config/db';

export const createAuditLog = async (params: {
  userId: string;
  action: string;
  module: string;
  oldValue?: string | null;
  newValue?: string | null;
  referenceId?: string | null;
}) => {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        module: params.module,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null,
        referenceId: params.referenceId || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
