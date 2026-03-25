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
    iconBg: "bg-blue-50 dark:bg-blue-950",
    iconColor: "text-blue-600 dark:text-blue-400",
    trendColor: "text-muted-foreground",
  },
  success: {
    iconBg: "bg-emerald-50 dark:bg-emerald-950",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    trendColor: "text-emerald-600 dark:text-emerald-400",
  },
  danger: {
    iconBg: "bg-red-50 dark:bg-red-950",
    iconColor: "text-red-600 dark:text-red-400",
    trendColor: "text-red-600 dark:text-red-400",
  },
  warning: {
    iconBg: "bg-orange-50 dark:bg-orange-950",
    iconColor: "text-orange-600 dark:text-orange-400",
    trendColor: "text-orange-600 dark:text-orange-400",
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
    <Card>
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-base sm:text-2xl font-bold tracking-tight truncate">{value}</p>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                {trend.value >= 0 ? (
                  <TrendingUp className="h-3 w-3 shrink-0 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 shrink-0 text-red-500" />
                )}
                <span
                  className={cn(
                    "font-medium",
                    trend.value >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {trend.value >= 0 ? "+" : ""}
                  {trend.value.toFixed(1)}%
                </span>
                <span className="text-muted-foreground hidden sm:inline">{trend.label}</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
              styles.iconBg
            )}
          >
            <div className={styles.iconColor}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
