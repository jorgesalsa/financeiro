import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AuthSessionProvider } from "./session-provider";
import prisma from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  // Fetch memberships and unread notifications in parallel
  const [memberships, unreadNotifications] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: user.id },
      include: {
        tenant: {
          select: { id: true, name: true, cnpj: true, slug: true, active: true },
        },
      },
      orderBy: { tenant: { name: "asc" } },
    }),
    prisma.notification.count({
      where: { userId: user.id, read: false },
    }),
  ]);

  // Determine current tenant from DB (isDefault membership) — not from JWT
  // This ensures consistency even if the JWT is stale after a tenant switch
  const defaultMembership = memberships.find((m) => m.isDefault);
  const currentTenantId = defaultMembership?.tenantId || user.tenantId || "";
  const tenantName = defaultMembership?.tenant.name || "Sem empresa";

  const tenants = memberships.map((m) => ({
    tenantId: m.tenantId,
    tenantName: m.tenant.name,
    tenantCnpj: m.tenant.cnpj,
    active: m.tenant.active,
    role: m.role,
    isDefault: m.isDefault,
  }));

  return (
    <AuthSessionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          userName={user.name || "Usuário"}
          tenantName={tenantName}
          currentTenantId={currentTenantId}
          tenants={tenants}
          unreadNotifications={unreadNotifications}
        />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-4 pt-14 lg:p-6 lg:pt-6">{children}</div>
        </main>
      </div>
    </AuthSessionProvider>
  );
}
