import prisma from "@/lib/db";
import { getPluggyClient } from "@/lib/pluggy";
import { classifyStagingEntries } from "@/lib/services/classification";
import { createAuditLog } from "@/lib/utils/audit";
import type { Transaction } from "pluggy-sdk";

interface SyncParams {
  tenantId: string;
  userId: string;
  userEmail: string;
  connectionId: string;
  pluggyAccountId: string;
  bankAccountId: string;
  connectorName: string;
  from?: string;
  to?: string;
}

interface SyncResult {
  batchId: string;
  total: number;
  classified: number;
  skipped: number;
}

export async function syncTransactionsFromPluggy(
  params: SyncParams
): Promise<SyncResult> {
  const {
    tenantId,
    userId,
    userEmail,
    connectionId,
    pluggyAccountId,
    bankAccountId,
    connectorName,
    from,
    to,
  } = params;

  const client = getPluggyClient();

  // 1. Create import batch
  const batch = await prisma.importBatch.create({
    data: {
      tenantId,
      type: "PLUGGY_SYNC",
      fileName: `Pluggy Sync - ${connectorName}`,
      status: "PROCESSING",
      totalRecords: 0,
      processedRecords: 0,
      errorRecords: 0,
      importedById: userId,
    },
  });

  try {
    // 2. Fetch all transactions from Pluggy (handles pagination)
    const transactions = await client.fetchAllTransactions(pluggyAccountId, {
      from: from || undefined,
      to: to || undefined,
    });

    const stagingIds: string[] = [];
    let skipped = 0;

    // 3. Process each transaction
    for (const tx of transactions) {
      const externalId = tx.id;

      // Check for duplicate using externalId
      const existing = await prisma.bankStatementLine.findFirst({
        where: {
          tenantId,
          bankAccountId,
          externalId,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const amount = Math.abs(tx.amount);
      const type = tx.type === "DEBIT" ? "DEBIT" : "CREDIT";
      const transactionDate = new Date(tx.date);

      // Create BankStatementLine
      await prisma.bankStatementLine.create({
        data: {
          tenantId,
          importBatchId: batch.id,
          bankAccountId,
          transactionDate,
          description: tx.description || tx.descriptionRaw || "Sem descricao",
          document: tx.providerCode || null,
          amount,
          balance: tx.balance ?? 0,
          type,
          externalId,
        },
      });

      // Create StagingEntry
      const counterpartCnpj =
        tx.paymentData?.payer?.documentNumber?.value ||
        tx.paymentData?.receiver?.documentNumber?.value ||
        tx.merchant?.cnpj ||
        null;

      const counterpartName =
        tx.paymentData?.payer?.name ||
        tx.paymentData?.receiver?.name ||
        tx.merchant?.name ||
        null;

      const staging = await prisma.stagingEntry.create({
        data: {
          tenantId,
          importBatchId: batch.id,
          source: "IMPORT_PLUGGY",
          status: "PENDING",
          date: transactionDate,
          description: tx.description || tx.descriptionRaw || "Sem descricao",
          amount,
          type,
          counterpartCnpjCpf: counterpartCnpj,
          counterpartName: counterpartName,
          bankAccountId,
          createdById: userId,
        },
      });

      stagingIds.push(staging.id);
    }

    // 4. Auto-classify staging entries
    let classified = 0;
    if (stagingIds.length > 0) {
      const result = await classifyStagingEntries(tenantId, stagingIds);
      classified = result.classified;
    }

    // 5. Update batch to completed
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMPLETED",
        totalRecords: transactions.length,
        processedRecords: stagingIds.length,
        errorRecords: skipped,
        completedAt: new Date(),
      },
    });

    // 6. Update connection lastSyncAt
    await prisma.pluggyConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date() },
    });

    // 7. Audit log
    await createAuditLog({
      tenantId,
      tableName: "ImportBatch",
      recordId: batch.id,
      action: "CREATE",
      newValues: {
        type: "PLUGGY_SYNC",
        connectorName,
        totalTransactions: transactions.length,
        imported: stagingIds.length,
        skipped,
        classified,
      },
      userId,
      userEmail,
    });

    return {
      batchId: batch.id,
      total: stagingIds.length,
      classified,
      skipped,
    };
  } catch (error) {
    // Mark batch as failed
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: "FAILED" },
    });

    // Update connection with error
    await prisma.pluggyConnection.update({
      where: { id: connectionId },
      data: {
        status: "ERROR",
        executionError:
          error instanceof Error ? error.message : "Erro desconhecido",
      },
    });

    throw error;
  }
}
