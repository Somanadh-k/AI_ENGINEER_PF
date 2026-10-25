"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiTrigger({
  label = "Ask my AI",
  className,
  variant = "outline",
  icon = true,
}: {
  label?: string;
  className?: string;
  variant?: "outline" | "primary" | "bare";
  icon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("so:assistant"))}
      className={cn(
        variant === "primary" && "btn btn-primary",
        variant === "outline" && "btn btn-ghost",
        variant === "bare" &&
          "group inline-flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-cyan",
        className,
      )}
    >
      {icon && <Sparkles size={13} className={variant === "bare" ? "text-cyan" : ""} />}
      {label}
    </button>
  );
}
