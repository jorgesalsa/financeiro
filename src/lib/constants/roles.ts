import type { Role } from "@/generated/prisma";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  CONTROLLER: "Controller",
  ANALYST: "Analista",
  VIEWER: "Visualizador",
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 4,
  CONTROLLER: 3,
  ANALYST: 2,
  VIEWER: 1,
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
