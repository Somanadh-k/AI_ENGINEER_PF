"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const NeuralScene = dynamic(() => import("./NeuralScene"), { ssr: false });

export function NeuralBackdrop() {
  const [enabled, setEnabled] = useState(false);
  const [density, setDensity] = useState(1);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let supported = false;
    try {
      const probe = document.createElement("canvas");
      supported = Boolean(
        probe.getContext("webgl2") ||
          probe.getContext("webgl") ||
          probe.getContext("experimental-webgl"),
      );
    } catch {
      supported = false;
    }
    if (!supported) return;
    const timer = window.setTimeout(() => {
      setDensity(window.innerWidth >= 1024 ? 1 : 0.45);
      setEnabled(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_72%_38%,rgba(0,229,255,0.10),transparent_65%),radial-gradient(45%_55%_at_18%_70%,rgba(137,87,255,0.10),transparent_70%)]" />
      <div className="grid-fade absolute inset-0 opacity-70" />
      {enabled && (
        <div className="absolute inset-0 opacity-80">
          <NeuralScene density={density} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-void to-transparent" />
    </div>
  );
}
