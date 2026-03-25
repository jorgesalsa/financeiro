"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth-utils";
import { getPluggyClient } from "@/lib/pluggy";
import { createAuditLog } from "@/lib/utils/audit";
import { syncTransactionsFromPluggy } from "@/lib/services/pluggy-sync";
import type { PluggyConnectionStatus } from "@/generated/prisma";

// ─── Create Connect Token ─────────────────────────────────────────────────────

export async function createConnectToken(itemId?: string) {
  await getCurrentUser();
  const client = getPluggyClient();
  const result = await client.createConnectToken(itemId);
  return result.accessToken;
}

// ─── Save Pluggy Connection ───────────────────────────────────────────────────

function mapPluggyStatus(pluggyStatus: string): PluggyConnectionStatus {
  switch (pluggyStatus) {
    case "UPDATED":
      return "UPDATED";
    case "OUTDATED":
      return "OUTDATED";
    case "WAITING_USER_INPUT":
    case "WAITING_USER_ACTION":
      return "WAITING_USER_INPUT";
    case "LOGIN_ERROR":
    case "MERGING":
      return "ERROR";
    default:
      return "LOGIN_IN_PROGRESS";
  }
}

export async function savePluggyConnection(pluggyItemId: string) {
  const user = await getCurrentUser();
  const client = getPluggyClient();

  // Fetch item details from Pluggy
  const item = await client.fetchItem(pluggyItemId);

  // Fetch accounts for this item
  const accountsResponse = await client.fetchAccounts(pluggyItemId);
  const accounts = accountsResponse.results || [];

  // Check if connection already exists
  const existing = await prisma.pluggyConnection.findUnique({
    where: { pluggyItemId },
  });

  if (existing) {
    // Update status
    await prisma.pluggyConnection.update({
      where: { pluggyItemId },
      data: {
        status: mapPluggyStatus(item.status),
        executionError: item.error?.message ?? null,
      },
    });

    revalidatePath("/imports/pluggy");
    return {
      connection: existing,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        number: a.number,
        type: a.type,
        balance: a.balance,
        currencyCode: a.currencyCode,
      })),
    };
  }

  // Create new connection
  const connection = await prisma.pluggyConnection.create({
    data: {
      tenantId: user.tenantId,
      pluggyItemId,
      connectorId: item.connector.id,
      connectorName: item.connector.name,
      connectorLogo: item.connector.imageUrl ?? null,
      status: mapPluggyStatus(item.status),
      executionError: item.error?.message ?? null,
      createdById: user.id,
    },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "PluggyConnection",
    recordId: connection.id,
    action: "CREATE",
    newValues: {
      pluggyItemId,
      connectorName: item.connector.name,
      connectorId: item.connector.id,
    },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/imports/pluggy");

  return {
    connection: {
      id: connection.id,
      pluggyItemId: connection.pluggyItemId,
      connectorName: connection.connectorName,
      connectorLogo: connection.connectorLogo,
      status: connection.status,
    },
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      number: a.number,
      type: a.type,
      balance: a.balance,
      currencyCode: a.currencyCode,
    })),
  };
}

// ─── Link Pluggy Account to BankAccount ───────────────────────────────────────

export async function linkPluggyAccount(
  connectionId: string,
  bankAccountId: string,
  pluggyAccountId: string
) {
  const user = await getCurrentUser();

  // Verify ownership
  const connection = await prisma.pluggyConnection.findFirst({
    where: { id: connectionId, tenantId: user.tenantId },
  });
  if (!connection) throw new Error("Conexao nao encontrada");

  const bankAccount = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, tenantId: user.tenantId },
  });
  if (!bankAccount) throw new Error("Conta bancaria nao encontrada");

  await prisma.pluggyConnection.update({
    where: { id: connectionId },
    data: { bankAccountId, pluggyAccountId },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "PluggyConnection",
    recordId: connectionId,
    action: "UPDATE",
    newValues: {
      bankAccountId,
      pluggyAccountId,
      bankAccountName: `${bankAccount.bankName} - ${bankAccount.accountNumber}`,
    },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/imports/pluggy");
}

// ─── Sync Pluggy Transactions ─────────────────────────────────────────────────

export async function syncPluggyTransactions(
  connectionId: string,
  from?: string,
  to?: string
) {
  const user = await requireRole(["CONTROLLER", "ADMIN"]);

  const connection = await prisma.pluggyConnection.findFirst({
    where: { id: connectionId, tenantId: user.tenantId },
  });

  if (!connection) throw new Error("Conexao nao encontrada");
  if (!connection.bankAccountId || !connection.pluggyAccountId) {
    throw new Error(
      "Conexao nao vinculada a uma conta bancaria. Vincule primeiro."
    );
  }

  const result = await syncTransactionsFromPluggy({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: user.email,
    connectionId: connection.id,
    pluggyAccountId: connection.pluggyAccountId,
    bankAccountId: connection.bankAccountId,
    connectorName: connection.connectorName,
    from,
    to,
  });

  revalidatePath("/imports/pluggy");
  revalidatePath("/staging");
  revalidatePath("/imports/bank-statements");

  return result;
}

// ─── List Pluggy Connections ──────────────────────────────────────────────────

export async function listPluggyConnections() {
  const user = await getCurrentUser();

  const connections = await prisma.pluggyConnection.findMany({
    where: { tenantId: user.tenantId },
    include: {
      bankAccount: {
        select: {
          id: true,
          bankName: true,
          bankCode: true,
          agency: true,
          accountNumber: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return connections.map((c) => ({
    id: c.id,
    pluggyItemId: c.pluggyItemId,
    connectorId: c.connectorId,
    connectorName: c.connectorName,
    connectorLogo: c.connectorLogo,
    status: c.status,
    lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
    executionError: c.executionError,
    bankAccountId: c.bankAccountId,
    pluggyAccountId: c.pluggyAccountId,
    bankAccount: c.bankAccount
      ? {
          id: c.bankAccount.id,
          bankName: c.bankAccount.bankName,
          accountNumber: c.bankAccount.accountNumber,
          agency: c.bankAccount.agency,
        }
      : null,
    createdAt: c.createdAt.toISOString(),
  }));
}

// ─── Delete Pluggy Connection ─────────────────────────────────────────────────

export async function deletePluggyConnection(connectionId: string) {
  const user = await requireRole(["CONTROLLER", "ADMIN"]);

  const connection = await prisma.pluggyConnection.findFirst({
    where: { id: connectionId, tenantId: user.tenantId },
  });

  if (!connection) throw new Error("Conexao nao encontrada");

  // Try to delete item in Pluggy
  try {
    const client = getPluggyClient();
    await client.deleteItem(connection.pluggyItemId);
  } catch {
    // Ignore errors (item may already be deleted)
  }

  await prisma.pluggyConnection.delete({
    where: { id: connectionId },
  });

  await createAuditLog({
    tenantId: user.tenantId,
    tableName: "PluggyConnection",
    recordId: connectionId,
    action: "DELETE",
    oldValues: {
      connectorName: connection.connectorName,
      pluggyItemId: connection.pluggyItemId,
    },
    userId: user.id,
    userEmail: user.email,
  });

  revalidatePath("/imports/pluggy");
}

// ─── List Import Batches (Pluggy) ─────────────────────────────────────────────

export async function listPluggySyncBatches() {
  const user = await getCurrentUser();

  const batches = await prisma.importBatch.findMany({
    where: { tenantId: user.tenantId, type: "PLUGGY_SYNC" },
    orderBy: { createdAt: "desc" },
    include: {
      importedBy: { select: { name: true } },
    },
    take: 50,
  });

  return batches.map((b) => ({
    id: b.id,
    fileName: b.fileName,
    status: b.status,
    totalRecords: b.totalRecords,
    processedRecords: b.processedRecords,
    errorRecords: b.errorRecords,
    importedBy: b.importedBy?.name ?? "—",
    createdAt: b.createdAt.toISOString(),
    completedAt: b.completedAt?.toISOString() ?? null,
  }));
}
