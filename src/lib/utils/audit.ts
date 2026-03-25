import prisma from "@/lib/db";
import type { AuditAction, Prisma } from "@/generated/prisma";

interface AuditLogParams {
  tenantId: string;
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  userId: string;
  userEmail: string;
  ipAddress?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  return prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      tableName: params.tableName,
      recordId: params.recordId,
      action: params.action,
      oldValues: (params.oldValues ?? undefined) as Prisma.InputJsonValue | undefined,
      newValues: (params.newValues ?? undefined) as Prisma.InputJsonValue | undefined,
      userId: params.userId,
      userEmail: params.userEmail,
      ipAddress: params.ipAddress,
    },
  });
}

export function diffObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): { old: Record<string, unknown>; new: Record<string, unknown> } {
  const oldDiff: Record<string, unknown> = {};
  const newDiff: Record<string, unknown> = {};

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      oldDiff[key] = oldObj[key];
      newDiff[key] = newObj[key];
    }
  }

  return { old: oldDiff, new: newDiff };
}
