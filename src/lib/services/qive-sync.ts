import prisma from "@/lib/db";
import {
  fetchAllReceivedNFes,
  parseNFeXML,
} from "@/lib/qive";
import { classifyStagingEntries } from "@/lib/services/classification";
import { createAuditLog } from "@/lib/utils/audit";

interface QiveSyncParams {
  tenantId: string;
  userId: string;
  userEmail: string;
  connectionId: string;
  apiId: string;
  apiKey: string;
  startCursor?: string;
}

interface QiveSyncResult {
  batchId: string;
  total: number;
  classified: number;
  skipped: number;
}

export async function syncNFesFromQive(
  params: QiveSyncParams
): Promise<QiveSyncResult> {
  const {
    tenantId,
    userId,
    userEmail,
    connectionId,
    apiId,
    apiKey,
    startCursor,
  } = params;

  // 1. Create import batch
  const batch = await prisma.importBatch.create({
    data: {
      tenantId,
      type: "QIVE_SYNC",
      fileName: "QIVE Sync - NFes Recebidas",
      status: "PROCESSING",
      totalRecords: 0,
      processedRecords: 0,
      errorRecords: 0,
      importedById: userId,
    },
  });

  try {
    // 2. Fetch all NFes from QIVE (handles pagination)
    const { nfes, lastCursor } = await fetchAllReceivedNFes(
      apiId,
      apiKey,
      startCursor
    );

    const stagingIds: string[] = [];
    let skipped = 0;
    let errors = 0;

    // 3. Process each NFe
    for (const nfe of nfes) {
      const externalId = nfe.access_key;

      // Check for duplicate using externalId (access_key)
      const existing = await prisma.taxInvoiceLine.findFirst({
        where: {
          tenantId,
          externalId,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      try {
        // Parse the XML
        const parsed = parseNFeXML(nfe.xml, nfe.access_key);

        // Create TaxInvoiceLine
        await prisma.taxInvoiceLine.create({
          data: {
            tenantId,
            importBatchId: batch.id,
            invoiceNumber: parsed.invoiceNumber || "S/N",
            series: parsed.series || null,
            issueDate: parsed.issueDate,
            cnpjIssuer: parsed.cnpjIssuer,
            issuerName: parsed.issuerName || "Nao identificado",
            cnpjRecipient: parsed.cnpjRecipient,
            cfop: parsed.cfop || "0000",
            productCode: null,
            productDescription: parsed.productDescription || null,
            ncm: null,
            quantity: 1,
            unitPrice: parsed.totalValue,
            totalValue: parsed.totalValue,
            icmsValue: parsed.icmsValue,
            ipiValue: parsed.ipiValue,
            pisValue: parsed.pisValue,
            cofinsValue: parsed.cofinsValue,
            accessKey: parsed.accessKey,
            externalId,
          },
        });

        // Create StagingEntry for classification pipeline
        const staging = await prisma.stagingEntry.create({
          data: {
            tenantId,
            importBatchId: batch.id,
            source: "IMPORT_QIVE",
            status: "PENDING",
            date: parsed.issueDate,
            description: `NF ${parsed.invoiceNumber} - ${parsed.issuerName}`,
            amount: parsed.totalValue,
            type: "DEBIT", // NFe recebida = compra = débito
            counterpartCnpjCpf: parsed.cnpjIssuer || null,
            counterpartName: parsed.issuerName || null,
            createdById: userId,
          },
        });

        stagingIds.push(staging.id);
      } catch (parseError) {
        console.error(
          `Error parsing NFe ${nfe.access_key}:`,
          parseError
        );
        errors++;
      }
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
        totalRecords: nfes.length,
        processedRecords: stagingIds.length,
        errorRecords: skipped + errors,
        completedAt: new Date(),
      },
    });

    // 6. Update connection cursor and lastSyncAt
    await prisma.qiveConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAt: new Date(),
        lastCursor: lastCursor || undefined,
        status: "ACTIVE",
        executionError: null,
      },
    });

    // 7. Audit log
    await createAuditLog({
      tenantId,
      tableName: "ImportBatch",
      recordId: batch.id,
      action: "CREATE",
      newValues: {
        type: "QIVE_SYNC",
        totalNFes: nfes.length,
        imported: stagingIds.length,
        skipped,
        errors,
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
    await prisma.qiveConnection.update({
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
