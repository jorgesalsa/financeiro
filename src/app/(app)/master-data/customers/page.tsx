import { listCustomers } from "@/lib/actions/master-data";
import { PageHeader } from "@/components/layout/page-header";
import { CustomersClient } from "./client";

export default async function CustomersPage() {
  const customers = await listCustomers();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Gerencie os clientes cadastrados"
      />
      <CustomersClient data={customers} />
    </div>
  );
}
