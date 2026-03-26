"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/utils/audit";
import { parseOFX } from "@/lib/utils/ofx-parser";
import { parseCSV } from "@/lib/utils/csv-parser";
import { parseExcel } from "@/lib/utils/excel-parser";
import { classifyStagingEntries } from "@/lib/services/classification";
import { parseNFeXMLRaw } from "@/lib/qive";

export async function importBankStatement(formData: FormData) {
  const user = await getCurrentUser();
  const file = formData.get("file") as File;
  const bankAccountId = formData.get("bankAccountId") as string;

  if (!file || !bankAccountId) throw new Error("Arquivo e conta bancária são obrigatórios");

  const content = await file.text();
  const fileName = file.name.toLowerCase();

  // Create import batch
  const batch = await prisma.importBatch.create({
    data: {
      tenantId: user.tenantId,
      type: "BANK_STATEMENT",
      fileName: file.name,
      status: "PROCESSING",
      totalRecords: 0,
      processedRecords: 0,
      errorRecords: 0,
      importedById: user.id,
    },
  });

  try {
    let transactions: {
      date: Date;
      amount: number;
      description: string;
      document: string;
      type: "CREDIT" | "DEBIT";
      balance?: number;
    }[] = [];

    if (fileName.endsWith(".ofx") || fileName.endsWith(".ofc")) {
      transactions = parseOFX(content);
    } else if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
      const parsed = parseCSV(content, ";");
      transactions = parsed.rows.map((row) => {
        const dateStr = row["Data"] || row["data"] || row["DATE"] || "";
        const descStr =
          row["Descrição"] ||
          row["Descricao"] ||
          row["descricao"] ||
          row["Historico"] ||
          row["MEMO"] ||
          "";
        const amtStr = row["Valor"] || row["valor"] || row["AMOUNT"] || "0";
        const docStr = row["Documento"] || row["documento"] || row["DOC"] || "";

        const amount = parseFloat(amtStr.replace(/[^\d,.-]/g, "").replace(",", "."));
        const parts = dateStr.split(/[/\-\.]/);
        let date: Date;
        if (parts[0]?.length === 4) {
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }

        return {
          date,
          amount: Math.abs(amount),
          description: descStr.trim(),
          document: docStr.trim(),
          type: (amount >= 0 ? "CREDIT" : "DEBIT") as "CREDIT" | "DEBIT",
        };
      });
    } else {
      throw new Error("Formato não suportado. Use OFX, CSV ou TXT.");
    }

    // Update batch total
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { totalRecords: transactions.length },
    });

    // Create bank statement lines and staging entries
    const stagingIds: string[] = [];

    for (const trx of transactions) {
      const bsLine = await prisma.bankStatementLine.create({
        data: {
          tenantId: user.tenantId,
          importBatchId: batch.id,
          bankAccountId,
          transactionDate: trx.date,
          description: trx.description,
          document: trx.document,
          amount: trx.amount,
          balance: trx.balance ?? 0,
          type: trx.type,
        },
      });

      const staging = await prisma.stagingEntry.create({
        data: {
          tenantId: user.tenantId,
          importBatchId: batch.id,
          source: "IMPORT_BANK_STATEMENT",
          status: "PENDING",
          date: trx.date,
          description: trx.description,
          amount: trx.amount,
          type: trx.type,
          bankAccountId,
          createdById: user.id,
        },
      });

      stagingIds.push(staging.id);
    }

    // Auto-classify
    const classResult = await classifyStagingEntries(user.tenantId, stagingIds);

    // Complete batch
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMPLETED",
        processedRecords: transactions.length,
        completedAt: new Date(),
      },
    });

    await createAuditLog({
      tenantId: user.tenantId,
      tableName: "ImportBatch",
      recordId: batch.id,
      action: "CREATE",
      newValues: {
        type: "BANK_STATEMENT",
        totalRecords: transactions.length,
        classified: classResult.classified,
      },
      userId: user.id,
      userEmail: user.email,
    });

    revalidatePath("/imports/bank-statements");
    revalidatePath("/staging");
    return { batchId: batch.id, total: transactions.length, classified: classResult.classified };
  } catch (err: any) {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: "FAILED" },
    });
    throw new Error(`Erro na importação: ${err.message}`);
  }
}

export async function importCardTransactions(formData: FormData) {
  const user = await getCurrentUser();
  const file = formData.get("file") as File;

  if (!file) throw new Error("Arquivo é obrigatório");

  const buffer = await file.arrayBuffer();
  const fileName = file.name.toLowerCase();

  let rows: Record<string, string>[] = [];

  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    const content = await file.text();
    const parsed = parseCSV(content, ";");
    rows = parsed.rows;
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const parsed = parseExcel(buffer);
    rows = parsed.rows;
  } else {
    throw new Error("Formato não suportado. Use CSV, TXT ou XLSX.");
  }

  const batch = await prisma.importBatch.create({
    data: {
      tenantId: user.tenantId,
      type: "CARD_TRANSACTION",
      fileName: file.name,
      status: "PROCESSING",
      totalRecords: rows.length,
      processedRecords: 0,
      errorRecords: 0,
      importedById: user.id,
    },
  });

  try {
    const stagingIds: string[] = [];

    for (const row of rows) {
      const dateStr = row["Data Transação"] || row["Data"] || row["data_transacao"] || "";
      const settleDateStr = row["Data Repasse"] || row["data_repasse"] || "";
      const desc = row["Descrição"] || row["Estabelecimento"] || row["descricao"] || "";
      const grossStr = row["Valor Bruto"] || row["valor_bruto"] || "0";
      const feeStr = row["Taxa"] || row["taxa"] || "0";
      const netStr = row["Valor Líquido"] || row["valor_liquido"] || "0";
      const brand = row["Bandeira"] || row["bandeira"] || "";
      const lastFour = row["Final Cartão"] || row["final_cartao"] || "";
      const authCode = row["Autorização"] || row["autorizacao"] || "";
      const installNum = row["Parcela"] || row["parcela"] || "1";
      const totalInstall = row["Total Parcelas"] || row["total_parcelas"] || "1";

      const parseAmount = (s: string) =>
        parseFloat(s.replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
      const parseDate = (s: string) => {
        if (!s) return new Date();
        const parts = s.split(/[/\-\.]/);
        if (parts[0]?.length === 4)
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      };

      const cardTrx = await prisma.cardTransaction.create({
        data: {
          tenantId: user.tenantId,
          importBatchId: batch.id,
          cardBrand: brand,
          lastFourDigits: lastFour,
          transactionDate: parseDate(dateStr),
          settlementDate: settleDateStr ? parseDate(settleDateStr) : null,
          description: desc,
          grossAmount: parseAmount(grossStr),
          feeAmount: parseAmount(feeStr),
          netAmount: parseAmount(netStr),
          installmentNumber: parseInt(installNum) || 1,
          totalInstallments: parseInt(totalInstall) || 1,
          authorizationCode: authCode,
          status: "PENDING",
        },
      });

      const staging = await prisma.stagingEntry.create({
        data: {
          tenantId: user.tenantId,
          importBatchId: batch.id,
          source: "IMPORT_CARD",
          status: "PENDING",
          date: parseDate(dateStr),
          description: `${brand} ${desc}`.trim(),
          amount: parseAmount(netStr),
          type: "CREDIT",
          createdById: user.id,
        },
      });

      stagingIds.push(staging.id);
    }

    const classResult = await classifyStagingEntries(user.tenantId, stagingIds);

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: "COMPLETED", processedRecords: rows.length, completedAt: new Date() },
    });

    revalidatePath("/imports/card-transactions");
    revalidatePath("/staging");
    return { batchId: batch.id, total: rows.length, classified: classResult.classified };
  } catch (err: any) {
    await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "FAILED" } });
    throw new Error(`Erro na importação: ${err.message}`);
  }
}

export async function importTaxInvoices(formData: FormData) {
  const user = await getCurrentUser();
  const file = formData.get("file") as File;
  if (!file) throw new Error("Arquivo é obrigatório");

  const buffer = await file.arrayBuffer();
  const fileName = file.name.toLowerCase();

  let rows: Record<string, string>[] = [];
  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    const content = await file.text();
    const parsed = parseCSV(content, ";");
    rows = parsed.rows;
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const parsed = parseExcel(buffer);
    rows = parsed.rows;
  } else {
    throw new Error("Formato não suportado. Use CSV, TXT ou XLSX.");
  }

  const batch = await prisma.importBatch.create({
    data: {
      tenantId: user.tenantId,
      type: "TAX_INVOICE",
      fileName: file.name,
      status: "PROCESSING",
      totalRecords: rows.length,
      processedRecords: 0,
      errorRecords: 0,
      importedById: user.id,
    },
  });

  try {
    const stagingIds: string[] = [];
    const parseAmt = (s: string) =>
      parseFloat((s || "0").replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
    const parseDate = (s: string) => {
      if (!s) return new Date();
      const parts = s.split(/[/\-\.]/);
      if (parts[0]?.length === 4)
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    };

    for (const row of rows) {
      const invoiceNumber = row["Número NF"] || row["numero_nf"] || "";
      const cnpjIssuer = row["CNPJ Emitente"] || row["cnpj_emitente"] || "";
      const issuerName = row["Nome Emitente"] || row["nome_emitente"] || "";
      const issueDate = parseDate(row["Data Emissão"] || row["data_emissao"] || "");
      const totalValue = parseAmt(row["Valor Total"] || row["valor_total"] || "0");

      await prisma.taxInvoiceLine.create({
        data: {
          tenantId: user.tenantId,
          importBatchId: batch.id,
          invoiceNumber,
          series: row["Série"] || row["serie"] || "",
          issueDate,
          cnpjIssuer,
          issuerName,
          cnpjRecipient: row["CNPJ Destinatário"] || row["cnpj_destinatario"] || "",
          cfop: row["CFOP"] || row["cfop"] || "",
          productCode: row["Código Produto"] || row["codigo_produto"] || "",
          productDescription: row["Descrição"] || row["descricao"] || "",
          ncm: row["NCM"] || row["ncm"] || "",
          quantity: parseAmt(row["Quantidade"] || row["quantidade"] || "0"),
          unitPrice: parseAmt(row["Valor Unitário"] || row["valor_unitario"] || "0"),
          totalValue,
          icmsValue: parseAmt(row["ICMS"] || row["icms"] || "0"),
          ipiValue: parseAmt(row["IPI"] || row["ipi"] || "0"),
          pisValue: parseAmt(row["PIS"] || row["pis"] || "0"),
          cofinsValue: parseAmt(row["COFINS"] || row["cofins"] || "0"),
          accessKey: row["Chave Acesso"] || row["chave_acesso"] || "",
        },
      });

      // Create StagingEntry for validation pipeline
      const staging = await prisma.stagingEntry.create({
        data: {
          tenantId: user.tenantId,
          importBatchId: batch.id,
          source: "IMPORT_TAX_INVOICE",
          status: "PENDING",
          date: issueDate,
          description: `NF ${invoiceNumber} - ${issuerName || cnpjIssuer}`.trim(),
          amount: totalValue,
          type: "DEBIT",
          counterpartCnpjCpf: cnpjIssuer || null,
          counterpartName: issuerName || null,
          createdById: user.id,
        },
      });

      stagingIds.push(staging.id);
    }

    // Auto-classify staging entries
    let classified = 0;
    if (stagingIds.length > 0) {
      const classResult = await classifyStagingEntries(user.tenantId, stagingIds);
      classified = classResult.classified;
    }

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: "COMPLETED", processedRecords: rows.length, completedAt: new Date() },
    });

    revalidatePath("/imports/tax-invoices");
    revalidatePath("/staging");
    return { batchId: batch.id, total: rows.length, classified };
  } catch (err: any) {
    await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "FAILED" } });
    throw new Error(`Erro na importação: ${err.message}`);
  }
}

export async function importTaxInvoicesXML(formData: FormData) {
  const user = await getCurrentUser();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) throw new Error("Selecione ao menos um arquivo XML");

  // Validate all files are XML
  for (const file of files) {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xml")) {
      throw new Error(`Arquivo "${file.name}" não é XML. Envie apenas arquivos .xml`);
    }
  }

  const batch = await prisma.importBatch.create({
    data: {
      tenantId: user.tenantId,
      type: "TAX_INVOICE",
      fileName: files.length === 1 ? files[0].name : `${files.length} arquivos XML`,
      status: "PROCESSING",
      totalRecords: files.length,
      processedRecords: 0,
      errorRecords: 0,
      importedById: user.id,
    },
  });

  try {
    let processed = 0;
    let errors = 0;
    const errorMessages: string[] = [];
    const stagingIds: string[] = [];

    for (const file of files) {
      try {
        const xmlContent = await file.text();

        // Check if file contains multiple NFes (e.g. from a ZIP export or concatenated file)
        // Split by <nfeProc or <NFe tags
        const nfeBlocks: string[] = [];
        const nfeProcRegex = /<nfeProc[^>]*>[\s\S]*?<\/nfeProc>/gi;
        const nfeProcMatches = xmlContent.match(nfeProcRegex);

        if (nfeProcMatches && nfeProcMatches.length > 0) {
          nfeBlocks.push(...nfeProcMatches);
        } else {
          // Try matching standalone <NFe> blocks
          const nfeRegex = /<NFe[^>]*>[\s\S]*?<\/NFe>/gi;
          const nfeMatches = xmlContent.match(nfeRegex);
          if (nfeMatches && nfeMatches.length > 0) {
            nfeBlocks.push(...nfeMatches);
          } else {
            // Treat entire file as a single NFe
            nfeBlocks.push(xmlContent);
          }
        }

        for (const nfeXml of nfeBlocks) {
          const parsed = parseNFeXMLRaw(nfeXml);

          if (!parsed.invoiceNumber && !parsed.cnpjIssuer) {
            errorMessages.push(`${file.name}: XML não contém dados de NFe válidos`);
            errors++;
            continue;
          }

          // Deduplicate by accessKey if available
          if (parsed.accessKey) {
            const existing = await prisma.taxInvoiceLine.findFirst({
              where: {
                tenantId: user.tenantId,
                accessKey: parsed.accessKey,
              },
            });
            if (existing) {
              // Skip duplicate
              continue;
            }
          }

          await prisma.taxInvoiceLine.create({
            data: {
              tenantId: user.tenantId,
              importBatchId: batch.id,
              invoiceNumber: parsed.invoiceNumber,
              series: parsed.series || "",
              issueDate: parsed.issueDate,
              cnpjIssuer: parsed.cnpjIssuer,
              issuerName: parsed.issuerName,
              cnpjRecipient: parsed.cnpjRecipient,
              cfop: parsed.cfop,
              productDescription: parsed.productDescription,
              quantity: 1,
              unitPrice: parsed.totalValue,
              totalValue: parsed.totalValue,
              icmsValue: parsed.icmsValue,
              ipiValue: parsed.ipiValue,
              pisValue: parsed.pisValue,
              cofinsValue: parsed.cofinsValue,
              accessKey: parsed.accessKey || null,
              externalId: parsed.accessKey || null,
            },
          });

          // Create StagingEntry for validation pipeline
          const staging = await prisma.stagingEntry.create({
            data: {
              tenantId: user.tenantId,
              importBatchId: batch.id,
              source: "IMPORT_TAX_INVOICE",
              status: "PENDING",
              date: parsed.issueDate,
              description: `NF ${parsed.invoiceNumber} - ${parsed.issuerName || parsed.cnpjIssuer}`.trim(),
              amount: parsed.totalValue,
              type: "DEBIT",
              counterpartCnpjCpf: parsed.cnpjIssuer || null,
              counterpartName: parsed.issuerName || null,
              createdById: user.id,
            },
          });

          stagingIds.push(staging.id);
          processed++;
        }
      } catch (fileErr: any) {
        errorMessages.push(`${file.name}: ${fileErr.message}`);
        errors++;
      }
    }

    // Auto-classify staging entries
    let classified = 0;
    if (stagingIds.length > 0) {
      const classResult = await classifyStagingEntries(user.tenantId, stagingIds);
      classified = classResult.classified;
    }

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: errors > 0 && processed === 0 ? "FAILED" : "COMPLETED",
        processedRecords: processed,
        errorRecords: errors,
        totalRecords: processed + errors,
        completedAt: new Date(),
      },
    });

    revalidatePath("/imports/tax-invoices");
    revalidatePath("/staging");
    return {
      batchId: batch.id,
      total: processed,
      classified,
      errors,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    };
  } catch (err: any) {
    await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "FAILED" } });
    throw new Error(`Erro na importação XML: ${err.message}`);
  }
}

export async function importPurchaseInvoices(formData: FormData) {
  const user = await getCurrentUser();
  const file = formData.get("file") as File;
  if (!file) throw new Error("Arquivo é obrigatório");

  const buffer = await file.arrayBuffer();
  const fileName = file.name.toLowerCase();

  let rows: Record<string, string>[] = [];
  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    const content = await file.text();
    const parsed = parseCSV(content, ";");
    rows = parsed.rows;
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const parsed = parseExcel(buffer);
    rows = parsed.rows;
  } else {
    throw new Error("Formato não suportado.");
  }

  const batch = await prisma.importBatch.create({
    data: {
      tenantId: user.tenantId,
      type: "PURCHASE_INVOICE",
      fileName: file.name,
      status: "PROCESSING",
      totalRecords: rows.length,
      processedRecords: 0,
      errorRecords: 0,
      importedById: user.id,
    },
  });

  try {
    const stagingIds: string[] = [];
    const parseAmt = (s: string) =>
      parseFloat((s || "0").replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
    const parseDate = (s: string) => {
      if (!s) return new Date();
      const parts = s.split(/[/\-\.]/);
      if (parts[0]?.length === 4)
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    };

    for (const row of rows) {
      const supplierCnpj = row["CNPJ Fornecedor"] || row["cnpj_fornecedor"] || "";
      const totalValue = parseAmt(row["Valor Total"] || row["valor_total"] || "0");

      // Try to find supplier
      let supplierId: string | undefined;
      if (supplierCnpj) {
        const supplier = await prisma.supplier.findFirst({
          where: { tenantId: user.tenantId, cnpjCpf: supplierCnpj.replace(/\D/g, "") },
        });
        if (supplier) supplierId = supplier.id;
      }

      const invoice = await prisma.purchaseInvoice.create({
        data: {
          tenantId: user.tenantId,
          importBatchId: batch.id,
          invoiceNumber: row["Número NF"] || row["numero_nf"] || "",
          series: row["Série"] || row["serie"] || "",
          issueDate: parseDate(row["Data Emissão"] || row["data_emissao"] || ""),
          supplierId: supplierId!,
          totalValue,
          discountValue: parseAmt(row["Desconto"] || "0"),
          freightValue: parseAmt(row["Frete"] || "0"),
          otherCosts: parseAmt(row["Outras Despesas"] || "0"),
          netValue: totalValue,
          accessKey: row["Chave Acesso"] || row["chave_acesso"] || "",
          notes: row["Observações"] || "",
        },
      });

      const staging = await prisma.stagingEntry.create({
        data: {
          tenantId: user.tenantId,
          importBatchId: batch.id,
          source: "IMPORT_PURCHASE_INVOICE",
          status: "PENDING",
          date: parseDate(row["Data Emissão"] || row["data_emissao"] || ""),
          description:
            `NF ${row["Número NF"] || ""} - ${row["Nome Fornecedor"] || supplierCnpj}`.trim(),
          amount: totalValue,
          type: "DEBIT",
          counterpartCnpjCpf: supplierCnpj || null,
          counterpartName: row["Nome Fornecedor"] || null,
          supplierId: supplierId ?? null,
          createdById: user.id,
        },
      });

      stagingIds.push(staging.id);
    }

    const classResult = await classifyStagingEntries(user.tenantId, stagingIds);

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: "COMPLETED", processedRecords: rows.length, completedAt: new Date() },
    });

    revalidatePath("/imports/purchase-invoices");
    revalidatePath("/staging");
    return { batchId: batch.id, total: rows.length, classified: classResult.classified };
  } catch (err: any) {
    await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "FAILED" } });
    throw new Error(`Erro na importação: ${err.message}`);
  }
}

export async function listImportBatches(type?: string) {
  const user = await getCurrentUser();
  return prisma.importBatch.findMany({
    where: {
      tenantId: user.tenantId,
      ...(type ? { type: type as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { importedBy: { select: { name: true } } },
    take: 50,
  });
}
