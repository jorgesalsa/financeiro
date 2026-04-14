"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { switchTenant } from "@/lib/actions/tenant";
import { Building2, ChevronDown, Check, Loader2 } from "lucide-react";

export type TenantOption = {
  tenantId: string;
  tenantName: string;
  tenantCnpj: string | null;
  active: boolean;
  role: string;
  isDefault: boolean;
};

interface TenantSwitcherProps {
  currentTenantId: string;
  currentTenantName: string;
  tenants: TenantOption[];
}

export function TenantSwitcher({
  currentTenantId,
  currentTenantName,
  tenants,
}: TenantSwitcherProps) {
  const { update } = useSession();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  async function handleSwitch(tenantId: string) {
    setSwitching(true);
    try {
      await switchTenant(tenantId);

      // Refresh the JWT with the new default tenant.
      // Retry up to 3 times with a short backoff in case of DB replica lag
      // (serverless environments like Vercel+Neon can have a brief propagation
      // delay between the write in switchTenant and the read in the JWT callback).
      let updatedSession = await update();
      for (let attempt = 1; attempt < 3; attempt++) {
        if ((updatedSession?.user as any)?.tenantId === tenantId) break;
        await new Promise((r) => setTimeout(r, 300 * attempt));
        updatedSession = await update();
      }

      setOpen(false);
      // Full page reload to refresh all server components with new tenant context
      window.location.href = "/dashboard";
    } catch (err: any) {
      alert(err.message);
      setSwitching(false);
    }
  }

  // Single tenant — no need to show switcher
  if (tenants.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
        <p className="text-xs text-sidebar-foreground/60 truncate">
          {currentTenantName}
        </p>
      </div>
    );
  }

  // Use currentTenantId from session/layout (not isDefault from DB)
  // to determine which tenant is active — avoids mismatch when JWT is stale
  const otherTenants = tenants.filter((t) => t.tenantId !== currentTenantId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/10 disabled:opacity-50"
      >
        <Building2 className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
        <span className="flex-1 truncate text-xs text-sidebar-foreground/80">
          {switching ? "Trocando..." : currentTenantName}
        </span>
        {switching ? (
          <Loader2 className="h-3 w-3 animate-spin text-sidebar-foreground/40" />
        ) : (
          <ChevronDown
            className={`h-3 w-3 text-sidebar-foreground/40 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {open && !switching && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-white/10 bg-sidebar shadow-xl">
          <div className="px-3 py-2 border-b border-white/10">
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold">
              Trocar empresa
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {otherTenants.length === 0 && (
              <p className="px-3 py-2 text-[10px] text-sidebar-foreground/40 italic">
                Nenhuma outra empresa encontrada ({tenants.length} total)
              </p>
            )}
            {otherTenants.map((t) => (
              <button
                key={t.tenantId}
                onClick={() => t.active && handleSwitch(t.tenantId)}
                disabled={!t.active}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  t.active
                    ? "hover:bg-white/10"
                    : "opacity-40 cursor-not-allowed"
                }`}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs text-sidebar-foreground/90">
                    {t.tenantName}
                    {!t.active && (
                      <span className="ml-1.5 text-[9px] text-red-400">(inativa)</span>
                    )}
                  </p>
                  {t.tenantCnpj && (
                    <p className="truncate text-[10px] text-sidebar-foreground/40">
                      {t.tenantCnpj}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-sidebar-foreground/40 shrink-0 uppercase">
                  {t.role === "ADMIN"
                    ? "Admin"
                    : t.role === "CONTROLLER"
                      ? "Controller"
                      : t.role === "ANALYST"
                        ? "Analista"
                        : "Viewer"}
                </span>
              </button>
            ))}
          </div>
          {/* Current tenant indicator */}
          <div className="border-t border-white/10 px-3 py-2 flex items-center gap-2">
            <Check className="h-3 w-3 text-green-400" />
            <span className="text-[10px] text-sidebar-foreground/50 truncate">
              {currentTenantName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
