"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth-utils";
import { createInternalTransfer } from "@/lib/services/transfer";
import { internalTransferSchema } from "@/lib/validations/rules";

export async function listInternalTransfers() {
  const user = await getCurrentUser();
  return prisma.internalTransfer.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { transferDate: "desc" },
    include: {
      sourceAccount: { select: { bankName: true, accountNumber: true } },
      targetAccount: { select: { bankName: true, accountNumber: true } },
      createdBy: { select: { name: true } },
    },
    take: 100,
  });
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
