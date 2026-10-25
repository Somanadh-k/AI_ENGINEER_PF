"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

interface Params {
  connectivity: number;
  speed: number;
  noise: number;
}

const DEFAULTS: Params = { connectivity: 0.55, speed: 1, noise: 0.18 };

export function NeuralExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const paramsRef = useRef<Params>(DEFAULTS);
  const pausedRef = useRef(false);
  const rafRef = useRef(0);
  const [params, setParams] = useState<Params>(DEFAULTS);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frame = window.requestAnimationFrame(() => setPaused(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const nodes = Array.from({ length: 44 }, (_, index) => ({
      x: Math.random(),
      y: Math.random(),
      seed: Math.random() * Math.PI * 2,
      size: index % 11 === 0 ? 2.2 : 1.2,
    }));
    const pulses: { from: number; to: number; t: number; speed: number }[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, width * dpr);
      canvas.height = Math.max(1, height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    let last = performance.now();

    const draw = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { connectivity, speed, noise } = paramsRef.current;
      context.clearRect(0, 0, width, height);

      const time = now / 1000;
      const points = nodes.map((node) => ({
        x:
          node.x * width +
          Math.sin(time * 0.35 * speed + node.seed) * noise * 22 +
          Math.cos(time * 0.18 + node.seed * 2) * noise * 8,
        y:
          node.y * height +
          Math.cos(time * 0.3 * speed + node.seed) * noise * 16 +
          Math.sin(time * 0.22 + node.seed) * noise * 6,
        size: node.size,
        seed: node.seed,
      }));

      const threshold = 46 + connectivity * 120;
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
          if (distance < threshold) {
            const alpha = (1 - distance / threshold) * 0.24;
            context.beginPath();
            context.moveTo(points[i].x, points[i].y);
            context.lineTo(points[j].x, points[j].y);
            context.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
            context.lineWidth = 0.6;
            context.stroke();
          }
        }
      }

      for (const point of points) {
        context.beginPath();
        context.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        context.fillStyle = "rgba(160, 248, 255, 0.7)";
        context.fill();
        if (point.size > 2) {
          context.beginPath();
          context.arc(point.x, point.y, point.size * 3.2, 0, Math.PI * 2);
          context.fillStyle = "rgba(0, 229, 255, 0.06)";
          context.fill();
        }
      }

      if (!pausedRef.current) {
        if (Math.random() < 0.08 * speed && pulses.length < 26) {
          const from = Math.floor(Math.random() * points.length);
          let nearest = -1;
          let nearestDistance = Number.POSITIVE_INFINITY;
          for (let j = 0; j < points.length; j += 1) {
            if (j === from) continue;
            const distance = Math.hypot(points[from].x - points[j].x, points[from].y - points[j].y);
            if (distance < nearestDistance && distance < threshold) {
              nearestDistance = distance;
              nearest = j;
            }
          }
          if (nearest >= 0) pulses.push({ from, to: nearest, t: 0, speed: 0.6 + Math.random() * 0.8 });
        }
        for (let i = pulses.length - 1; i >= 0; i -= 1) {
          const pulse = pulses[i];
          pulse.t += delta * pulse.speed * speed;
          if (pulse.t >= 1) {
            pulses.splice(i, 1);
            continue;
          }
          const a = points[pulse.from];
          const b = points[pulse.to];
          const x = a.x + (b.x - a.x) * pulse.t;
          const y = a.y + (b.y - a.y) * pulse.t;
          context.beginPath();
          context.arc(x, y, 1.4, 0, Math.PI * 2);
          context.fillStyle = "rgba(118, 255, 215, 0.95)";
          context.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, []);

  const set = (key: keyof Params, value: number) => {
    setParams((previous) => ({ ...previous, [key]: value }));
  };

  return (
    <div className="border border-line bg-[#0a0c12]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="label text-cyan">Neural explorer</p>
          <p className="mono mt-1 text-[0.5rem] uppercase tracking-[0.14em] text-muted/50">
            Procedural · not data
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Resume simulation" : "Pause simulation"}
            className="flex h-8 w-8 items-center justify-center border border-line text-muted transition-colors hover:text-silver"
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </button>
          <button
            type="button"
            onClick={() => setParams(DEFAULTS)}
            aria-label="Reset simulation"
            className="flex h-8 w-8 items-center justify-center border border-line text-muted transition-colors hover:text-silver"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      <div ref={wrapRef} className="relative h-56 w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0" aria-hidden />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,transparent_30%,rgba(8,9,13,.55)_100%)]" />
        <p className="mono absolute bottom-3 left-3 text-[0.45rem] uppercase tracking-[0.16em] text-muted/40">
          {paused ? "simulation paused" : "live simulation"}
        </p>
      </div>

      <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-3">
        {(
          [
            ["connectivity", "Connectivity"],
            ["speed", "Pulse rate"],
            ["noise", "Perturbation"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-2 flex items-center justify-between">
              <span className="label">{label}</span>
              <span className="mono text-[0.5rem] text-cyan/70">
                {key === "speed" ? params[key].toFixed(1) : params[key].toFixed(2)}
              </span>
            </span>
            <input
              type="range"
              min={key === "speed" ? 0 : 0.02}
              max={key === "speed" ? 2.2 : 1}
              step={0.01}
              value={params[key]}
              onChange={(event) => set(key, Number(event.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan"
              aria-label={label}
            />
          </label>
        ))}
      </div>
      <p className="border-t border-line px-4 py-2.5 text-[0.5625rem] leading-relaxed text-muted/50">
        A small interactive system, included because visualisations should be manipulable. The numbers on
        the admin dashboard are measured; this is not one of them.
      </p>
    </div>
  );
}
