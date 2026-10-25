"use client";

import { useLiveVisitors } from "@/hooks/use-live-visitors";
import { cn } from "@/lib/utils";

export function LiveVisitors({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { active, status } = useLiveVisitors();
  const count = active ?? 0;

  return (
    <div
      className={cn("flex items-center gap-2.5", className)}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            status === "live" ? "bg-mint live-dot" : status === "offline" ? "bg-muted/60" : "bg-mint/40",
          )}
        />
      </span>
      <span className="label whitespace-nowrap !tracking-[0.14em]">
        {status === "loading" && "measuring signal"}
        {status === "offline" && "signal offline"}
        {status === "live" &&
          (count === 0
            ? "no explorers online"
            : `${count} ${count === 1 ? "explorer" : "explorers"} online`)}
      </span>
      {!compact && (
        <span className="hidden text-[0.625rem] text-muted/60 sm:inline">
          / {status === "live" ? "live" : "static"}
        </span>
      )}
    </div>
  );
}
