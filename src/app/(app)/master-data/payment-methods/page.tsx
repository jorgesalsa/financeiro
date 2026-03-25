import { listPaymentMethods } from "@/lib/actions/master-data";
import { PageHeader } from "@/components/layout/page-header";
import { PaymentMethodsClient } from "./client";

export default async function PaymentMethodsPage() {
  const paymentMethods = await listPaymentMethods();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Formas de Pagamento"
        description="Gerencie as formas de pagamento disponíveis"
      />
      <PaymentMethodsClient data={paymentMethods.map((pm) => ({
        ...pm,
        feePercentage: Number(pm.feePercentage),
      }))} />
    </div>
  );
}
