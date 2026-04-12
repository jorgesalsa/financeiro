"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "./command-palette";
import type { TenantOption } from "./tenant-switcher";

interface SidebarShellProps {
  userName: string;
  tenantName: string;
  currentTenantId: string;
  tenants: TenantOption[];
  unreadNotifications: number;
}

export function SidebarShell(props: SidebarShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <Sidebar {...props} onOpenSearch={() => setPaletteOpen(true)} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}
