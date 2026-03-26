import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { PageHeader } from "@/components/layout/page-header";
import { TaxInvoicesListClient } from "./client";

export default async function TaxInvoicesListPage() {
  const user = await getCurrentUser();

  const invoices = await prisma.taxInvoiceLine.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { issueDate: "desc" },
    take: 500,
  });

  const serialized = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    series: inv.series,
    issueDate: inv.issueDate.toISOString(),
    cnpjIssuer: inv.cnpjIssuer,
    issuerName: inv.issuerName,
    cnpjRecipient: inv.cnpjRecipient,
    cfop: inv.cfop,
    productDescription: inv.productDescription,
    totalValue: Number(inv.totalValue),
    icmsValue: Number(inv.icmsValue),
    ipiValue: Number(inv.ipiValue),
    pisValue: Number(inv.pisValue),
    cofinsValue: Number(inv.cofinsValue),
    accessKey: inv.accessKey,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notas Fiscais"
        description="Visualize todas as notas fiscais importadas (CSV, XML e QIVE)"
      />
      <TaxInvoicesListClient invoices={serialized} />
    </div>
  );
}
