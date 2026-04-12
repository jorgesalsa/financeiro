"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigation } from "@/lib/constants/navigation";
import {
  LogOut,
  Menu,
  X,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { TenantSwitcher, type TenantOption } from "./tenant-switcher";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";

interface SidebarProps {
  userName: string;
  tenantName: string;
  currentTenantId: string;
  tenants: TenantOption[];
  unreadNotifications: number;
  onOpenSearch?: () => void;
}

const COLLAPSE_KEY = "sidebar:collapsed";

export function Sidebar({
  userName,
  tenantName,
  currentTenantId,
  tenants,
  unreadNotifications,
  onOpenSearch,
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved === "1") setIsCollapsed(true);
    } catch {}
    setHydrated(true);
  }, []);

  // Persist collapsed state
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(COLLAPSE_KEY, isCollapsed ? "1" : "0");
    } catch {}
  }, [isCollapsed, hydrated]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Global cmd+K trigger
  useEffect(() => {
    if (!onOpenSearch) return;
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenSearch?.();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onOpenSearch]);

  function renderSidebarContent(collapsed: boolean) {
    return (
      <>
        {/* Header */}
        <div
          className={cn(
            "border-b border-white/10 flex items-center gap-3",
            collapsed ? "p-3 flex-col" : "p-4 justify-between"
          )}
        >
          {collapsed ? (
            <Image
              src="/logo-icon.svg"
              alt="JSA"
              width={36}
              height={36}
              className="shrink-0"
              priority
            />
          ) : (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 mb-0.5">
                <Image
                  src="/logo-icon.svg"
                  alt="JSA"
                  width={28}
                  height={28}
                  className="shrink-0"
                  priority
                />
                <h1 className="text-[15px] font-bold tracking-wide bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                  FINANCE ERP
                </h1>
              </div>
              <TenantSwitcher
                currentTenantId={currentTenantId}
                currentTenantName={tenantName}
                tenants={tenants}
              />
            </div>
          )}
          {/* Close button - mobile only */}
          {!collapsed && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden rounded-lg p-1.5 text-sidebar-foreground/60 hover:bg-white/10 hover:text-sidebar-foreground transition-colors"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search trigger */}
        {onOpenSearch && (
          <div className={cn("pt-3", collapsed ? "px-2" : "px-3")}>
            <button
              onClick={onOpenSearch}
              className={cn(
                "group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sidebar-foreground/60 transition-all hover:border-white/20 hover:bg-white/10 hover:text-sidebar-foreground",
                collapsed
                  ? "h-9 w-9 justify-center"
                  : "w-full px-3 py-2 text-xs"
              )}
              title={collapsed ? "Buscar (⌘K)" : undefined}
            >
              <Search className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Buscar...</span>
                  <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-sidebar-foreground/60">
                    ⌘K
                  </kbd>
                </>
              )}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto",
            collapsed ? "p-2" : "p-3 space-y-4"
          )}
        >
          {navigation.map((group, groupIdx) => (
            <div key={group.label}>
              {!collapsed ? (
                <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {group.label}
                </div>
              ) : (
                groupIdx > 0 && (
                  <div className="my-2 border-t border-white/10" />
                )
              )}
              <div className={cn("space-y-0.5", collapsed && "space-y-1")}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group relative flex items-center rounded-xl text-sm transition-all duration-200",
                        collapsed
                          ? "h-10 w-10 justify-center mx-auto"
                          : "gap-2.5 px-3 py-2",
                        isActive
                          ? "bg-gradient-to-r from-indigo-600/90 to-indigo-500/70 text-white shadow-soft"
                          : "text-sidebar-foreground/75 hover:bg-white/10 hover:text-sidebar-foreground"
                      )}
                      title={collapsed ? item.title : undefined}
                    >
                      {isActive && !collapsed && (
                        <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-white" />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform",
                          !isActive && "group-hover:scale-[1.02]"
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate">{item.title}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          className={cn(
            "border-t border-white/10",
            collapsed ? "p-2" : "p-3"
          )}
        >
          {collapsed ? (
            <div className="flex flex-col items-center gap-1">
              <NotificationBell initialCount={unreadNotifications} />
              <ThemeToggle />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-xl p-2 text-sidebar-foreground/60 hover:bg-white/10 hover:text-sidebar-foreground transition-colors"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsCollapsed(false)}
                className="hidden lg:block rounded-xl p-2 text-sidebar-foreground/60 hover:bg-white/10 hover:text-sidebar-foreground transition-colors"
                title="Expandir"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[11px] font-semibold text-white">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <p className="truncate text-xs font-medium">{userName}</p>
                </div>
                <div className="flex items-center gap-0.5">
                  <NotificationBell initialCount={unreadNotifications} />
                  <ThemeToggle />
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="rounded-lg p-1.5 text-sidebar-foreground/60 hover:bg-white/10 hover:text-sidebar-foreground transition-colors"
                    title="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex w-full items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-[11px] text-sidebar-foreground/50 hover:bg-white/10 hover:text-sidebar-foreground/80 transition-colors"
                title="Recolher sidebar"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
                Recolher
              </button>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-40 lg:hidden glass rounded-xl p-2.5 text-foreground shadow-soft-lg"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-in) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-out lg:hidden shadow-2xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside
        className={cn(
          "hidden lg:flex h-screen flex-col bg-sidebar text-sidebar-foreground flex-shrink-0 transition-[width] duration-300 ease-out",
          isCollapsed ? "w-[68px]" : "w-64"
        )}
      >
        {renderSidebarContent(isCollapsed)}
      </aside>
    </>
  );
}
