"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getConsent, setConsent, type ConsentState } from "@/lib/telemetry";

export function ConsentNotice() {
  const [state, setState] = useState<ConsentState>("unset");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setState(getConsent());
      setMounted(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!mounted || state !== "unset") return null;

  return (
    <div
      role="region"
      aria-label="Analytics privacy choice"
      className="fixed bottom-20 left-4 z-[55] w-[min(calc(100vw-2rem),25rem)] animate-[fadeUp_.6s_var(--ease-out)_both] border border-line bg-graphite/95 p-4 shadow-[0_24px_80px_-20px_rgba(0,0,0,.9)] backdrop-blur-xl sm:bottom-6 sm:left-6"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-mint" aria-hidden />
        <p className="label label-strong">Privacy · your call</p>
      </div>
      <p className="text-[0.8125rem] leading-relaxed text-muted">
        This site can count anonymous visits — no cookies, no raw IP addresses, no
        individual profiles. Analytics stay off until you allow them.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setConsent("granted");
            setState("granted");
          }}
          className="btn btn-primary h-9 px-3"
        >
          Allow anonymous
        </button>
        <button
          type="button"
          onClick={() => {
            setConsent("denied");
            setState("denied");
          }}
          className="btn btn-ghost h-9 px-3"
        >
          No thanks
        </button>
        <Link href="/privacy" className="label ml-auto underline-offset-4 hover:text-silver hover:underline">
          Details
        </Link>
      </div>
    </div>
  );
}
