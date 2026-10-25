"use client";

import { useEffect, useState } from "react";
import { fetchLiveVisitors } from "@/lib/telemetry";

export function useLiveVisitors(intervalMs = 30000) {
  const [active, setActive] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "live" | "offline">("loading");

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (document.visibilityState === "hidden") return;
      const result = await fetchLiveVisitors();
      if (cancelled) return;
      if (result) {
        setActive(result.active);
        setStatus("live");
      } else {
        setStatus("offline");
      }
    }

    void tick();
    const timer = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return { active, status };
}
