"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth-utils";
import { createInternalTransfer } from "@/lib/services/transfer";
import { internalTransferSchema } from "@/lib/validations/rules";
import { normalizePagination, buildPaginatedResult, type PaginationParams } from "@/lib/utils/pagination";

export async function listInternalTransfers(params?: {
  pagination?: PaginationParams;
}) {
  const user = await getCurrentUser();
  const { skip, take, page, pageSize } = normalizePagination(params?.pagination);

  const where = { tenantId: user.tenantId };

  const [data, total] = await Promise.all([
    prisma.internalTransfer.findMany({
      where,
      orderBy: { transferDate: "desc" },
      include: {
        sourceAccount: { select: { bankName: true, accountNumber: true } },
        targetAccount: { select: { bankName: true, accountNumber: true } },
        createdBy: { select: { name: true } },
      },
      skip,
      take,
    }),
    prisma.internalTransfer.count({ where }),
  ]);

  return buildPaginatedResult(data, total, page, pageSize);
}

export async function createTransfer(data: {
  sourceAccountId: string;
  targetAccountId: string;
  amount: number;
  transferDate: string;
  reference?: string;
}) {
  const user = await requireRole(["ADMIN", "CONTROLLER"]);

  const validated = internalTransferSchema.parse({
    ...data,
    transferDate: new Date(data.transferDate),
  });

  const result = await createInternalTransfer({
    tenantId: user.tenantId,
    sourceAccountId: validated.sourceAccountId,
    targetAccountId: validated.targetAccountId,
    amount: validated.amount,
    transferDate: validated.transferDate,
    reference: validated.reference ?? null,
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/financial/transfers");
  revalidatePath("/financial/entries");
  return { transferId: result.transfer.id };
}
