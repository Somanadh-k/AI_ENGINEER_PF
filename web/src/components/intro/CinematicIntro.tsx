"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SESSION_KEY = "so.intro.v1";

interface Node {
  x: number;
  y: number;
  tx: number;
  ty: number;
  delay: number;
  size: number;
}

export function CinematicIntro() {
  const [stage, setStage] = useState<"idle" | "active" | "leaving" | "done">("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setStage("leaving");
    timerRef.current.push(setTimeout(() => setStage("done"), 620));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let seen = false;
      try {
        seen = sessionStorage.getItem(SESSION_KEY) === "1";
      } catch {
        seen = false;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (seen || reduced) {
        setStage("done");
        return;
      }
      setStage("active");
      timerRef.current.push(setTimeout(finish, 3000));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [finish]);

  useEffect(() => {
    if (stage !== "active" && stage !== "leaving") return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== "active" && stage !== "leaving") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const nodes: Node[] = [];
    const count = window.innerWidth < 640 ? 64 : 112;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const build = () => {
      nodes.length = 0;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * (width < 640 ? 0.28 : 0.24);
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const ring = Math.sqrt(Math.random());
        const tx = cx + Math.cos(angle) * radius * ring * 1.65;
        const ty = cy + Math.sin(angle) * radius * ring * 0.9;
        nodes.push({
          x: cx + (Math.random() - 0.5) * width * 0.9,
          y: cy + (Math.random() - 0.5) * height * 0.9,
          tx,
          ty,
          delay: 120 + i * 9,
          size: Math.random() > 0.86 ? 2.2 : 1.1,
        });
      }
    };

    resize();
    build();
    const start = performance.now();

    const draw = (now: number) => {
      const elapsed = now - start;
      context.clearRect(0, 0, width, height);

      // Central ignition point.
      const ignition = Math.min(1, elapsed / 500);
      context.beginPath();
      context.arc(width / 2, height / 2, 2 + ignition * 3, 0, Math.PI * 2);
      context.fillStyle = `rgba(0, 229, 255, ${0.85 * ignition})`;
      context.shadowColor = "rgba(0,229,255,.9)";
      context.shadowBlur = 24;
      context.fill();
      context.shadowBlur = 0;

      for (const node of nodes) {
        const t = Math.min(1, Math.max(0, (elapsed - node.delay) / 1400));
        const eased = 1 - Math.pow(1 - t, 3);
        const x = node.x + (node.tx - node.x) * eased;
        const y = node.y + (node.ty - node.y) * eased;
        node.x = x;
        node.y = y;
        context.beginPath();
        context.arc(x, y, node.size * (0.4 + eased * 0.6), 0, Math.PI * 2);
        context.fillStyle = `rgba(180, 248, 255, ${0.12 + eased * 0.55})`;
        context.fill();
      }

      // Connections only once the structure has begun to assemble.
      if (elapsed > 500) {
        const alphaBase = Math.min(0.18, (elapsed - 500) / 3000);
        for (let i = 0; i < nodes.length; i += 1) {
          for (let j = i + 1; j < nodes.length; j += 1) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const distance = Math.hypot(dx, dy);
            if (distance < 96) {
              context.beginPath();
              context.moveTo(nodes[i].x, nodes[i].y);
              context.lineTo(nodes[j].x, nodes[j].y);
              context.strokeStyle = `rgba(0, 229, 255, ${(1 - distance / 96) * alphaBase})`;
              context.lineWidth = 0.5;
              context.stroke();
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    const onResize = () => {
      resize();
      build();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [stage]);

  useEffect(() => {
    const timers = timerRef.current;
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, []);

  if (stage === "idle" || stage === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-void transition-all duration-[600ms] ${
        stage === "leaving" ? "pointer-events-none scale-[1.04] opacity-0" : "opacity-100"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Somanadh.OS introduction"
    >
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(8,9,13,.85)_75%)]"
      />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <p className="mono mb-6 text-[0.5625rem] uppercase tracking-[0.42em] text-cyan/70">
          Signal acquired
        </p>
        <h1 className="display text-[clamp(1.9rem,5vw,3.4rem)] uppercase tracking-[-0.03em] text-silver">
          Initializing <span className="text-cyan text-glow">Somanadh.OS</span>
        </h1>
        <p
          className="mono mt-5 max-w-md text-[0.625rem] uppercase leading-relaxed tracking-[0.24em] text-muted opacity-0"
          style={{ animation: "fadeUp .9s var(--ease-out) 1.1s forwards" }}
        >
          Connecting intelligence with engineering
        </p>
        <div className="mt-9 h-px w-52 overflow-hidden bg-white/10">
          <div
            className="h-full w-full origin-left bg-cyan"
            style={{ animation: "introProgress 3s linear forwards" }}
          />
        </div>
        <p className="mono mt-4 text-[0.5rem] uppercase tracking-[0.24em] text-muted/50">
          Assembling verified records · grounding assistant
        </p>
      </div>

      <button
        type="button"
        onClick={finish}
        className="absolute right-5 top-5 z-20 border border-line px-3 py-2 font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-muted transition-colors hover:border-cyan/40 hover:text-silver"
      >
        Skip intro
      </button>
    </div>
  );
}
