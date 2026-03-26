import { getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import prisma from "@/lib/db";
import { OnboardingClient } from "./client";

interface OnboardingPageProps {
  searchParams: Promise<{ tenantId?: string }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const tenantId = params.tenantId;

  if (!tenantId) {
    redirect("/settings/companies");
  }

  const user = await getCurrentUser();

  // Verify user has ADMIN membership in this tenant
  const membership = await prisma.membership.findUnique({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId,
      },
    },
    include: {
      tenant: { select: { name: true, cnpj: true } },
    },
  });

  if (!membership || membership.role !== "ADMIN") {
    redirect("/settings/companies");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuracao inicial"
        description="Configure sua nova empresa em poucos passos"
      />
      <OnboardingClient
        tenantId={tenantId}
        tenantName={membership.tenant.name}
        tenantCnpj={membership.tenant.cnpj ?? ""}
      />
    </div>
  );
}
