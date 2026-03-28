"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/utils/audit";
import { validateStagingEntry, incorporateStagingEntries } from "@/lib/services/staging";
import { stagingEntrySchema, type StagingEntryInput } from "@/lib/validations/staging";

export async function listStagingEntries(status?: string) {
  const user = await getCurrentUser();
  return prisma.stagingEntry.findMany({
    where: {
      tenantId: user.tenantId,
      ...(status ? { status: status as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      chartOfAccount: { select: { code: true, name: true } },
      costCenter: { select: { code: true, name: true } },
      supplier: { select: { name: true } },
      customer: { select: { name: true } },
      bankAccount: { select: { bankName: true, accountNumber: true } },
    },
    take: 200,
  });
}

export async function createStagingEntry(data: StagingEntryInput) {
  const user = await getCurrentUser();
  const validated = stagingEntrySchema.parse(data);

  const entry = await prisma.stagingEntry.create({
    data: {
      ...validated,
      tenantId: user.tenantId,
      source: "MANUAL",
      status: "PENDING",
      createdById: user.id,
    },
  });

  revalidatePath("/staging");
  return entry;
}

export async function updateStagingEntry(id: string, data: StagingEntryInput) {
  const user = await getCurrentUser();
  const validated = stagingEntrySchema.parse(data);

  // RA02: Allow editing in more states
  const existing = await prisma.stagingEntry.findFirstOrThrow({
    where: { id, tenantId: user.tenantId, status: { in: ["PENDING", "PARSED", "NORMALIZED", "AUTO_CLASSIFIED", "CONFLICT"] } },
  });

  const entry = await prisma.stagingEntry.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/staging");
  return entry;
}

export async function validateEntries(ids: string[]) {
  const user = await getCurrentUser();
  const results = [];

  for (const id of ids) {
    const result = await validateStagingEntry(id, user.tenantId, user.id, user.email);
    results.push({ id, ...result });
  }

  revalidatePath("/staging");
  return results;
}

export async function rejectStagingEntry(id: string, reason: string) {
  const user = await getCurrentUser();

  await prisma.stagingEntry.update({
    where: { id },
    data: { status: "REJECTED", rejectionReason: reason },
  });

  revalidatePath("/staging");
}

export async function incorporateEntries(ids: string[]) {
  const user = await requireRole(["ADMIN", "CONTROLLER"]);
  const results = await incorporateStagingEntries(ids, user.tenantId, user.id, user.email);
  revalidatePath("/staging");
  revalidatePath("/financial/entries");
  return results;
}
