import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import prisma from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  let tenantName = "Sem empresa";
  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true },
    });
    if (tenant) tenantName = tenant.name;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={user.name || "Usuário"}
        tenantName={tenantName}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-4 pt-14 lg:p-6 lg:pt-6">{children}</div>
      </main>
    </div>
  );
}
