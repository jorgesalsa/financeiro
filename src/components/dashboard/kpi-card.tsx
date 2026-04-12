"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; label: string };
  icon: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning";
}

const variantStyles = {
  default: {
    iconBg: "bg-gradient-to-br from-indigo-50 to-blue-50",
    iconRing: "ring-1 ring-indigo-100",
    iconColor: "text-indigo-600",
    accent: "from-indigo-500/10 via-transparent to-transparent",
  },
  success: {
    iconBg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    iconRing: "ring-1 ring-emerald-100",
    iconColor: "text-emerald-600",
    accent: "from-emerald-500/10 via-transparent to-transparent",
  },
  danger: {
    iconBg: "bg-gradient-to-br from-red-50 to-rose-50",
    iconRing: "ring-1 ring-red-100",
    iconColor: "text-red-600",
    accent: "from-red-500/10 via-transparent to-transparent",
  },
  warning: {
    iconBg: "bg-gradient-to-br from-amber-50 to-orange-50",
    iconRing: "ring-1 ring-amber-100",
    iconColor: "text-amber-600",
    accent: "from-amber-500/10 via-transparent to-transparent",
  },
};

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = "default",
}: KpiCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      variant="glass"
      interactive
      className="group relative overflow-hidden"
    >
      {/* Top accent gradient */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r",
          variant === "default" && "from-transparent via-indigo-400/60 to-transparent",
          variant === "success" && "from-transparent via-emerald-400/60 to-transparent",
          variant === "danger" && "from-transparent via-red-400/60 to-transparent",
          variant === "warning" && "from-transparent via-amber-400/60 to-transparent"
        )}
      />

      {/* Radial accent on hover */}
      <div
        className={cn(
          "pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100",
          styles.accent
        )}
      />

      <CardContent className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground/80 truncate">
              {title}
            </p>
            <p className="text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate transition-transform duration-200 group-hover:translate-x-0.5">
              {value}
            </p>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-1 pt-0.5 text-[10px] sm:text-xs">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
                    trend.value >= 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  )}
                >
                  {trend.value >= 0 ? (
                    <TrendingUp className="h-3 w-3 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3 w-3 shrink-0" />
                  )}
                  {trend.value >= 0 ? "+" : ""}
                  {trend.value.toFixed(1)}%
                </span>
                <span className="text-muted-foreground hidden sm:inline">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-[1.02] group-hover:rotate-[-2deg]",
              styles.iconBg,
              styles.iconRing
            )}
          >
            <div className={styles.iconColor}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
