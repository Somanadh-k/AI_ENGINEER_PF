"use client";

import { useEffect, useRef } from "react";

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const root = document.documentElement;
    root.classList.add("has-custom-cursor");

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: pointer.x, y: pointer.y };
    let raf = 0;
    let hovering = false;

    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
      }
      const target = (event.target as HTMLElement | null)?.closest(
        "a, button, [data-cursor]",
      ) as HTMLElement | null;
      const nextHovering = Boolean(target);
      if (nextHovering !== hovering) {
        hovering = nextHovering;
        const label = target?.dataset.cursorLabel;
        if (ringRef.current) {
          ringRef.current.style.width = label ? "74px" : hovering ? "48px" : "26px";
          ringRef.current.style.height = label ? "74px" : hovering ? "48px" : "26px";
          ringRef.current.style.borderColor = label
            ? "rgba(0,229,255,.8)"
            : hovering
              ? "rgba(220,229,242,.55)"
              : "rgba(220,229,242,.28)";
          ringRef.current.style.backgroundColor = label ? "rgba(0,229,255,.10)" : "transparent";
        }
        if (labelRef.current) {
          labelRef.current.textContent = label ?? "";
        }
      }
    };

    const onLeave = () => {
      if (dotRef.current) dotRef.current.style.opacity = "0";
      if (ringRef.current) ringRef.current.style.opacity = "0";
    };
    const onEnter = () => {
      if (dotRef.current) dotRef.current.style.opacity = "1";
      if (ringRef.current) ringRef.current.style.opacity = "1";
    };

    const loop = () => {
      ring.x += (pointer.x - ring.x) * 0.16;
      ring.y += (pointer.y - ring.y) * 0.16;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);

    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
    };
  }, []);

  return (
    <div className="cursor-root hidden md:block" aria-hidden>
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 flex items-center justify-center rounded-full border transition-[width,height,border-color,background-color] duration-300"
        style={{ width: 26, height: 26, borderColor: "rgba(220,229,242,.28)" }}
      >
        <span
          ref={labelRef}
          className="mono text-[0.5rem] font-medium uppercase tracking-[0.18em] text-cyan"
        />
      </div>
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 h-[3px] w-[3px] rounded-full bg-silver"
      />
    </div>
  );
}
