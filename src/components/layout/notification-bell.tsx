"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bell,
  FileCheck,
  ArrowDownCircle,
  ArrowUpCircle,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/admin";
import { useRouter } from "next/navigation";

type NotificationType =
  | "STAGING_PENDING"
  | "OVERDUE_PAYABLE"
  | "OVERDUE_RECEIVABLE"
  | "IMPORT_COMPLETED"
  | "INVITE_RECEIVED"
  | "SYSTEM";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

function typeIcon(type: NotificationType) {
  switch (type) {
    case "STAGING_PENDING":
      return <FileCheck className="h-4 w-4 text-orange-500" />;
    case "OVERDUE_PAYABLE":
      return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
    case "OVERDUE_RECEIVABLE":
      return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
    case "IMPORT_COMPLETED":
      return <Upload className="h-4 w-4 text-emerald-500" />;
    case "INVITE_RECEIVED":
      return <Users className="h-4 w-4 text-blue-500" />;
    case "SYSTEM":
      return <Bell className="h-4 w-4 text-gray-400" />;
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `ha ${diffMin} min`;
  if (diffH < 24) return `ha ${diffH}h`;
  if (diffD === 1) return "ontem";
  if (diffD < 7) return `ha ${diffD} dias`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

interface NotificationBellProps {
  initialCount: number;
}

export function NotificationBell({ initialCount }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  async function handleOpen() {
    setOpen(!open);
    if (!loaded) {
      try {
        const data = await listNotifications();
        setNotifications(data.map((n: any) => ({ ...n, createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt) })));
        setLoaded(true);
      } catch {
        // silently fail
      }
    }
  }

  async function handleMarkRead(notification: Notification) {
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // silently fail
      }
    }
    if (notification.href) {
      setOpen(false);
      router.push(notification.href);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-white/5 hover:text-sidebar-foreground transition-colors"
        title="Notificacoes"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-80 rounded-md border border-white/10 bg-sidebar shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <p className="text-xs font-semibold text-sidebar-foreground/80">
              Notificacoes
            </p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Marcar todas como lidas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-sidebar-foreground/40 hover:text-sidebar-foreground/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-sidebar-foreground/40">
                  Nenhuma notificacao
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${
                    !n.read ? "border-l-2 border-l-blue-400 bg-white/[0.03]" : ""
                  }`}
                >
                  <div className="shrink-0 mt-0.5">{typeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-sidebar-foreground/90 truncate">
                      {n.title}
                    </p>
                    <p className="text-[10px] text-sidebar-foreground/50 line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-sidebar-foreground/30 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="h-2 w-2 shrink-0 rounded-full bg-blue-400 mt-1" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
