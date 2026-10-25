"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Health {
  status: string;
  database: string;
  ai: { mode: string; configured: boolean; model: string | null };
  analytics: { activeWindowSeconds: number; consentRequired: boolean };
  time: string;
}

export function SystemStatus({ compact = false }: { compact?: boolean }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [offline, setOffline] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const response = await fetch("/api/proxy/health", {
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        });
        if (!response.ok) throw new Error("unhealthy");
        const data = (await response.json()) as Health;
        if (cancelled) return;
        setHealth(data);
        setOffline(false);
        setCheckedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch {
        if (cancelled) return;
        setOffline(true);
        setCheckedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
    };
    void check();
    const timer = setInterval(check, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const aiMode = health?.ai.mode === "openrouter" ? "OPENROUTER LIVE" : "LOCAL GROUNDED";
  const service = offline ? "STATIC MODE" : health ? "OPERATIONAL" : "CHECKING";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2",
        compact ? "text-[0.5625rem]" : "text-[0.625rem]",
      )}
      aria-live="polite"
    >
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-1 w-1 rounded-full",
            offline ? "bg-muted" : health ? "bg-mint live-dot" : "bg-cyan/40",
          )}
        />
        <span className="mono uppercase tracking-[0.16em] text-muted">
          Service <span className="text-silver">{service}</span>
        </span>
      </span>
      <span className="hidden h-2 w-px bg-line sm:block" />
      <span className="mono uppercase tracking-[0.16em] text-muted">
        Assistant <span className="text-silver">{health ? aiMode : "—"}</span>
      </span>
      {checkedAt && (
        <>
          <span className="hidden h-2 w-px bg-line sm:block" />
          <span className="mono uppercase tracking-[0.16em] text-muted/70">Checked {checkedAt}</span>
        </>
      )}
    </div>
  );
}
