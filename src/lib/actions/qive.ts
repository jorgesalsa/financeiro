"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/utils/audit";
import { testQiveCredentials } from "@/lib/qive";
import { syncNFesFromQive } from "@/lib/services/qive-sync";

// ─── Test QIVE Credentials ──────────────────────────────────────────────────

export async function testAndSaveQiveCredentials(
  apiId: string,
  apiKey: string
) {
  const user = await requireRole("CONTROLLER");

  if (!apiId || !apiKey) {
    throw new Error("API ID e API Key são obrigatórios");
  }

  // Test the credentials
  const valid = await testQiveCredentials(apiId, apiKey);
  if (!valid) {
    throw new Error(
      "Credenciais inválidas. Verifique o API ID e API Key no painel QIVE."
    );
  }

  // Check if connection already exists for this tenant
  const existing = await prisma.qiveConnection.findFirst({
    where: { tenantId: user.tenantId },
  });

  if (existing) {
    // Update existing connection
    await prisma.qiveConnection.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        executionError: null,
      },
    });

    // Store credentials in env (they're already in env vars)
    revalidatePath("/imports/qive");
    return { id: existing.id, updated: true };
  }

  // Create new connection
  const connection = await prisma.qiveConnection.create({
    data: {
      tenantId: user.tenantId,
      status: "ACTIVE",
      createdById: user.id,
    },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "QiveConnection",
    recordId: connection.id,
    action: "CREATE",
    newValues: { status: "ACTIVE" },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/imports/qive");
  return { id: connection.id, updated: false };
}

// ─── Sync QIVE NFes ─────────────────────────────────────────────────────────

export async function syncQiveNFes(connectionId: string) {
  const user = await requireRole("CONTROLLER");

  const connection = await prisma.qiveConnection.findFirst({
    where: {
      id: connectionId,
      tenantId: user.tenantId,
    },
  });

  if (!connection) {
    throw new Error("Conexão QIVE não encontrada");
  }

  const apiId = process.env.QIVE_API_ID;
  const apiKey = process.env.QIVE_API_KEY;

  if (!apiId || !apiKey) {
    throw new Error(
      "Credenciais QIVE não configuradas. Adicione QIVE_API_ID e QIVE_API_KEY nas variáveis de ambiente."
    );
  }

  const result = await syncNFesFromQive({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: user.email,
    connectionId: connection.id,
    apiId,
    apiKey,
    startCursor: connection.lastCursor || undefined,
  });

  revalidatePath("/imports/qive");
  return result;
}

// ─── List QIVE Connections ──────────────────────────────────────────────────

export async function listQiveConnections() {
  const user = await getCurrentUser();

  const connections = await prisma.qiveConnection.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: { name: true, email: true },
      },
    },
  });

  return connections.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    lastSyncAt: c.lastSyncAt?.toISOString() || null,
  }));
}

// ─── Delete QIVE Connection ─────────────────────────────────────────────────

export async function deleteQiveConnection(connectionId: string) {
  const user = await requireRole("ADMIN");

  const connection = await prisma.qiveConnection.findFirst({
    where: {
      id: connectionId,
      tenantId: user.tenantId,
    },
  });

  if (!connection) {
    throw new Error("Conexão QIVE não encontrada");
  }

  await prisma.qiveConnection.delete({
    where: { id: connectionId },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "QiveConnection",
    recordId: connectionId,
    action: "DELETE",
    oldValues: { status: connection.status },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/imports/qive");
}

// ─── List QIVE Sync Batches ─────────────────────────────────────────────────

export async function listQiveSyncBatches() {
  const user = await getCurrentUser();

  const batches = await prisma.importBatch.findMany({
    where: {
      tenantId: user.tenantId,
      type: "QIVE_SYNC",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      importedBy: {
        select: { name: true, email: true },
      },
    },
  });

  return batches.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    completedAt: b.completedAt?.toISOString() || null,
  }));
}
