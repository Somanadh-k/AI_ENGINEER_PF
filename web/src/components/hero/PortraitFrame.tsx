"use client";

import Image from "next/image";
import { useRef } from "react";
import type { HeroLabel, Profile } from "@/lib/types";

const POSITIONS = [
  "left-0 top-[7%] -translate-x-2 sm:-translate-x-8",
  "right-0 top-[24%] translate-x-1 sm:translate-x-6",
  "bottom-[25%] left-0 -translate-x-2 sm:-translate-x-10",
  "bottom-[8%] right-0 translate-x-1 sm:translate-x-5",
];

export function PortraitFrame({
  portrait,
  labels,
  name,
  initials,
}: {
  portrait: Profile["portrait"];
  labels: HeroLabel[];
  name: string;
  initials: string;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rafRef = useRef<number | null>(null);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = innerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      node.style.transform = `perspective(1100px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
      labelRefs.current.forEach((label, index) => {
        if (!label) return;
        const depth = index % 2 === 0 ? -7 : 7;
        label.style.transform = `translate3d(${(x * depth).toFixed(1)}px, ${(y * depth).toFixed(1)}px, 0)`;
      });
    });
  };

  const reset = () => {
    if (innerRef.current) {
      innerRef.current.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
    }
    labelRefs.current.forEach((label) => {
      if (label) label.style.transform = "translate3d(0,0,0)";
    });
  };

  return (
    <div
      className="relative mx-auto w-full max-w-[27rem] py-10 lg:max-w-[30rem]"
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/15 blur-[90px]"
      />
      <div
        aria-hidden
        className="absolute left-[18%] top-[10%] h-40 w-40 rounded-full bg-violet/20 blur-[70px]"
      />

      {/* Orbital instrument rings */}
      <div aria-hidden className="pointer-events-none absolute -inset-6 sm:-inset-10">
        <div className="absolute inset-0 animate-[spin_70s_linear_infinite]">
          <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
          <div className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan/80 shadow-[0_0_12px_2px_rgba(0,229,255,.5)]" />
          <div className="absolute bottom-[12%] left-[10%] h-1 w-1 rounded-full bg-mint/60" />
        </div>
        <div className="absolute inset-[7%] animate-[spin_46s_linear_infinite_reverse]">
          <div className="absolute inset-0 rounded-full border border-dashed border-white/[0.08]" />
          <div className="absolute right-[14%] top-[8%] h-1 w-1 rounded-full bg-violet" />
        </div>
        <div className="absolute inset-[18%] rounded-full border border-white/[0.04]" />
      </div>

      <div
        ref={innerRef}
        className="relative aspect-[4/5] overflow-hidden border border-white/10 bg-[#0b0e15] transition-transform duration-500 [transform-style:preserve-3d] will-change-transform"
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        <div aria-hidden className="absolute inset-0 grid-fade opacity-60" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_35%,rgba(0,229,255,0.13),transparent_65%),linear-gradient(180deg,rgba(137,87,255,0.08),transparent_45%,rgba(8,9,13,0.85))]"
        />

        {portrait.src ? (
          <Image
            src={portrait.src}
            alt={portrait.alt || `Portrait of ${name}`}
            fill
            sizes="(max-width: 1024px) 80vw, 460px"
            className="object-cover object-center opacity-95"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center" role="img" aria-label="Abstract holographic portrait placeholder. A real photograph can be uploaded by Somanadh.">
            <div aria-hidden className="absolute inset-0 opacity-50">
              <svg viewBox="0 0 400 500" className="h-full w-full" fill="none">
                {[1, 0.82, 0.64, 0.46, 0.28].map((scale) => (
                  <ellipse
                    key={scale}
                    cx="200"
                    cy="238"
                    rx={128 * scale}
                    ry={176 * scale}
                    stroke="rgba(0,229,255,0.16)"
                    strokeWidth="0.7"
                  />
                ))}
                <path d="M200 62v352M54 238h292" stroke="rgba(220,229,242,0.08)" strokeWidth="0.6" />
                <circle cx="200" cy="238" r="2.2" fill="#00E5FF" opacity="0.8" />
                <circle cx="200" cy="238" r="56" stroke="rgba(137,87,255,0.18)" strokeWidth="0.6" strokeDasharray="2 7" />
              </svg>
            </div>
            <span
              aria-hidden
              className="display relative z-10 text-[7.5rem] leading-none text-white/[0.13] sm:text-[9rem]"
            >
              {initials}
            </span>
            <div className="relative z-10 mt-2 text-center">
              <p className="label text-cyan/80">Subject frame · reserved</p>
              <p className="mono mt-2 max-w-[15rem] text-[0.5625rem] leading-relaxed tracking-[0.1em] text-muted/70">
                A real photograph will occupy this frame. No synthetic face is used.
              </p>
            </div>
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-cyan/[0.06] to-transparent scanline"
            />
          </div>
        )}

        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.18)_50%)] bg-[length:100%_3px] opacity-30" />

        {/* Corner brackets */}
        {[
          "left-2 top-2 border-l border-t",
          "right-2 top-2 border-r border-t",
          "left-2 bottom-2 border-b border-l",
          "right-2 bottom-2 border-b border-r",
        ].map((position) => (
          <span
            key={position}
            aria-hidden
            className={`absolute h-4 w-4 border-cyan/40 ${position}`}
          />
        ))}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 border-t border-white/10 bg-void/55 px-3 py-2.5 backdrop-blur-sm">
          <div>
            <p className="mono text-[0.5625rem] uppercase tracking-[0.2em] text-silver">{name}</p>
            <p className="mono mt-1 text-[0.5rem] uppercase tracking-[0.18em] text-muted/70">
              Human in the loop
            </p>
          </div>
          <p className="mono text-[0.5rem] uppercase tracking-[0.18em] text-cyan/70">Frame 01</p>
        </div>
      </div>

      {labels.slice(0, 4).map((label, index) => (
        <div
          key={label.text}
          ref={(node) => {
            labelRefs.current[index] = node;
          }}
          className={`pointer-events-none absolute z-20 hidden border border-line bg-void/70 px-2.5 py-1.5 backdrop-blur-md transition-transform duration-300 sm:block ${POSITIONS[index]}`}
        >
          <p className="mono text-[0.5rem] uppercase tracking-[0.18em] text-muted/60">{label.text}</p>
          <p className="mono mt-0.5 text-[0.5625rem] uppercase tracking-[0.12em] text-silver">
            {label.value}
          </p>
        </div>
      ))}
    </div>
  );
}
