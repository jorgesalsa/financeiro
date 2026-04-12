import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * Skeleton loading placeholder with shimmer effect.
 * Usage: <Skeleton className="h-4 w-24" />
 */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-slate-200/60",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/** Card-sized skeleton with header + body rows */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 sm:p-6 space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-11 w-11 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

/** Table row skeleton */
export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border/40">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === 0 ? "w-32" : "flex-1")}
        />
      ))}
    </div>
  );
}
