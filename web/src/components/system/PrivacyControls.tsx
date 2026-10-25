"use client";

import { useEffect, useState } from "react";
import { getConsent, onConsentChange, setConsent, type ConsentState } from "@/lib/telemetry";

const LABELS: Record<ConsentState, string> = {
  granted: "Anonymous analytics are on",
  denied: "Anonymous analytics are off",
  unset: "You have not chosen yet",
};

export function PrivacyControls() {
  const [state, setState] = useState<ConsentState>("unset");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setState(getConsent()));
    const unsubscribe = onConsentChange(() => setState(getConsent()));
    return () => {
      window.cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, []);

  return (
    <div className="border border-line bg-graphite/30 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label text-cyan">Current choice</p>
          <p className="mt-2 font-display text-lg tracking-tight text-silver">{LABELS[state]}</p>
        </div>
        <span
          aria-hidden
          className={`h-2 w-2 rounded-full ${state === "granted" ? "bg-mint" : "bg-muted/40"}`}
        />
      </div>
      <p className="mt-3 max-w-2xl text-[0.8125rem] leading-relaxed text-muted">
        You can change your mind at any time. Turning analytics off removes the anonymous visitor
        and session identifiers from this browser. It does not delete already-aggregated counts,
        because those records contain no identifier that could be traced back to you.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setConsent("granted");
            setState("granted");
          }}
          disabled={state === "granted"}
          className="btn btn-primary h-10 disabled:opacity-50"
        >
          Allow anonymous analytics
        </button>
        <button
          type="button"
          onClick={() => {
            setConsent("denied");
            setState("denied");
          }}
          disabled={state === "denied"}
          className="btn btn-ghost h-10 disabled:opacity-50"
        >
          Turn analytics off
        </button>
      </div>
    </div>
  );
}
