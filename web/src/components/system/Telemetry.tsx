"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  getConsent,
  onConsentChange,
  sendHeartbeat,
  trackEvent,
} from "@/lib/telemetry";

/**
 * Consent-gated, cookie-less telemetry. Nothing leaves the browser until the
 * visitor explicitly allows anonymous analytics.
 */
export function Telemetry() {
  const pathname = usePathname();
  const lastTick = useRef<number>(0);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const visibleDelta = () => {
      const now = Date.now();
      const elapsed = (now - lastTick.current) / 1000;
      lastTick.current = now;
      return document.visibilityState === "visible" ? Math.min(elapsed, 30) : 0;
    };

    const start = () => {
      if (getConsent() !== "granted") return;
      if (pathname.startsWith("/admin")) return;

      if (lastPath.current !== pathname) {
        lastPath.current = pathname;
        void trackEvent("pageview", { path: pathname });
      }
      lastTick.current = Date.now();
      void sendHeartbeat(0, pathname);

      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        void sendHeartbeat(visibleDelta(), pathname);
      }, 25000);
    };

    start();
    const unsubscribe = onConsentChange(start);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastTick.current = Date.now();
        void sendHeartbeat(0, pathname);
      } else {
        void sendHeartbeat(visibleDelta(), pathname);
      }
    };

    const onPageHide = () => {
      void sendHeartbeat(visibleDelta(), pathname);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      if (interval) clearInterval(interval);
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [pathname]);

  return null;
}
