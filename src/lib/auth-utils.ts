import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
  tenantSlug: string;
  memberRole: Role;
};

export async function getCurrentUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user as SessionUser;
}

export async function requireRole(allowedRoles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!allowedRoles.includes(user.memberRole)) {
    redirect("/dashboard?error=unauthorized");
  }
  return user;
}
