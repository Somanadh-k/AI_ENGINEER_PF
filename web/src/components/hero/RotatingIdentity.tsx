"use client";

import { useEffect, useState } from "react";

export function RotatingIdentity({
  identities,
  className,
}: {
  identities: string[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || identities.length < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const timer = setInterval(() => {
      setIndex((value) => (value + 1) % identities.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [identities.length, paused]);

  return (
    <div
      className={className ? `flex items-center gap-3 ${className}` : "flex items-center gap-3"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="off"
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-cyan live-dot" />
      </span>
      <div className="relative h-[1.15rem] overflow-hidden">
        <span
          key={identities[index]}
          className="mono absolute left-0 top-0 animate-[fadeUp_.45s_var(--ease-out)_both] whitespace-nowrap text-[0.5625rem] font-medium uppercase tracking-[0.14em] text-silver sm:text-[0.6875rem] sm:tracking-[0.2em]"
        >
          {identities[index]}
        </span>
        {/* Reserve width against the longest identity to avoid layout shift */}
        <span className="mono invisible whitespace-nowrap text-[0.5625rem] font-medium uppercase tracking-[0.14em] sm:text-[0.6875rem] sm:tracking-[0.2em]">
          {identities.reduce((a, b) => (a.length >= b.length ? a : b), "")}
        </span>
      </div>
    </div>
  );
}
