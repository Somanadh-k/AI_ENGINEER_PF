"use client";

import Link from "next/link";
import { ArrowUpRight, CircleDot, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

const POSITIONS: Record<string, { x: number; y: number; scale: number }> = {
  "somanadh-os": { x: 50, y: 46, scale: 1 },
  studentos: { x: 24, y: 67, scale: 0.82 },
  qems: { x: 77, y: 27, scale: 0.82 },
};

function positionFor(slug: string, index: number) {
  if (POSITIONS[slug]) return POSITIONS[slug];
  const angle = (index / 5) * Math.PI * 2;
  return {
    x: 50 + Math.cos(angle) * 30,
    y: 50 + Math.sin(angle) * 24,
    scale: 0.8,
  };
}

export function ProjectUniverse({ projects }: { projects: Project[] }) {
  const [activeSlug, setActiveSlug] = useState(projects[0]?.slug ?? "");
  const active = projects.find((project) => project.slug === activeSlug) ?? projects[0];
  const verified = projects.filter((project) => project.verified).length;

  const nodes = useMemo(
    () =>
      projects.map((project, index) => ({
        project,
        position: positionFor(project.slug, index),
      })),
    [projects],
  );

  if (!projects.length) return null;

  return (
    <section id="work" className="section relative border-t border-line">
      <div className="shell">
        <SectionHeading
          index="02"
          eyebrow="Selected work"
          title={
            <>
              The project <span className="serif-accent text-cyan">universe</span>.
            </>
          }
          description="A spatial index, not a card grid. Three records exist today; one is fully documented. The rest are held back until the facts are verified — no invented functionality, no decorative metrics."
          aside={
            <div className="flex items-center gap-6">
              <div>
                <p className="mono text-2xl text-silver">{String(projects.length).padStart(2, "0")}</p>
                <p className="label mt-1">Records</p>
              </div>
              <span className="h-8 w-px bg-line" aria-hidden />
              <div>
                <p className="mono text-2xl text-mint">{String(verified).padStart(2, "0")}</p>
                <p className="label mt-1">Verified</p>
              </div>
            </div>
          }
        />

        <div className="relative overflow-hidden border border-line bg-[#0a0c12]">
          <div aria-hidden className="absolute inset-0 grid-fade opacity-40" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_45%,rgba(0,229,255,0.07),transparent_70%)]"
          />

          <div className="relative hidden h-[36rem] md:block">
            <div className="absolute left-5 top-4 z-10">
              <p className="label text-cyan">Spatial index / live map</p>
              <p className="mono mt-1 text-[0.5rem] uppercase tracking-[0.16em] text-muted/50">
                Hover to inspect · select to enter
              </p>
            </div>
            <div className="absolute right-5 top-4 z-10 text-right">
              <p className="mono text-[0.5rem] uppercase tracking-[0.16em] text-muted/50">
                {String(projects.length).padStart(2, "0")} nodes · {String(verified).padStart(2, "0")} verified
              </p>
            </div>

            <svg
              className="absolute inset-0 h-full w-full"
              aria-hidden
              preserveAspectRatio="none"
            >
              {nodes.map(({ project, position }) => (
                <line
                  key={`center-${project.slug}`}
                  x1="50%"
                  y1="46%"
                  x2={`${position.x}%`}
                  y2={`${position.y}%`}
                  stroke={project.slug === activeSlug ? "rgba(0,229,255,0.28)" : "rgba(220,229,242,0.07)"}
                  strokeWidth="0.6"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray={project.verified ? undefined : "2 4"}
                />
              ))}
              {[18, 28, 38].map((radius) => (
                <ellipse
                  key={radius}
                  cx="50%"
                  cy="46%"
                  rx={`${radius}%`}
                  ry={`${radius * 0.62}%`}
                  fill="none"
                  stroke="rgba(220,229,242,0.05)"
                  strokeWidth="0.6"
                  strokeDasharray="1 6"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            <div
              aria-hidden
              className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan/20">
                <span className="mono text-[0.5rem] uppercase tracking-[0.16em] text-cyan/60">SK</span>
              </div>
            </div>

            {nodes.map(({ project, position }) => {
              const isActive = project.slug === activeSlug;
              return (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  onMouseEnter={() => setActiveSlug(project.slug)}
                  onFocus={() => setActiveSlug(project.slug)}
                  className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: `translate(-50%, -50%) scale(${position.scale})`,
                  }}
                  data-cursor-label="OPEN"
                  aria-label={`Open ${project.name} record`}
                >
                  <div className="relative flex flex-col items-center gap-3">
                    <div className="relative flex h-20 w-20 items-center justify-center">
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-0 rounded-full border transition-all duration-500",
                          isActive
                            ? "scale-110 border-cyan/50 bg-cyan/[0.06]"
                            : "border-white/10 group-hover:border-cyan/30",
                        )}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-3 rounded-full border border-dashed transition-transform duration-700",
                          isActive ? "rotate-45 border-cyan/30" : "border-white/[0.07]",
                        )}
                      />
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full transition-all duration-300",
                          project.verified ? "bg-cyan" : "bg-muted/50",
                          isActive && "shadow-[0_0_18px_4px_rgba(0,229,255,.35)]",
                        )}
                      />
                      {!project.verified && (
                        <LockKeyhole
                          size={10}
                          className="absolute bottom-2 text-muted/50"
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="text-center">
                      <p
                        className={cn(
                          "font-display text-base tracking-tight transition-colors",
                          isActive ? "text-silver" : "text-silver/70",
                        )}
                      >
                        {project.name}
                      </p>
                      <p className="mono mt-1 text-[0.5rem] uppercase tracking-[0.16em] text-muted/60">
                        {project.category}
                      </p>
                      <p
                        className={cn(
                          "mono mt-1.5 text-[0.45rem] uppercase tracking-[0.16em]",
                          project.verified ? "text-mint/80" : "text-muted/40",
                        )}
                      >
                        {project.verified ? "verified record" : "awaiting verification"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}

            {active && (
              <div className="absolute bottom-5 right-5 z-30 w-[22rem] border border-line bg-void/80 p-5 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="label text-cyan">{active.category}</p>
                    <p className="mt-2 font-display text-xl tracking-tight text-silver">{active.name}</p>
                  </div>
                  <span
                    className={cn(
                      "mt-1 flex items-center gap-1.5 border px-2 py-1 font-mono text-[0.45rem] uppercase tracking-[0.14em]",
                      active.verified
                        ? "border-mint/30 text-mint/90"
                        : "border-line text-muted/60",
                    )}
                  >
                    <CircleDot size={8} />
                    {active.verified ? "verified" : "pending"}
                  </span>
                </div>
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
                  {active.verified
                    ? active.summary
                    : "The record exists, but functionality and outcomes are not published yet. I would rather show nothing than invent it."}
                </p>
                {active.stack.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {active.stack.slice(0, 5).map((tech) => (
                      <span
                        key={tech}
                        className="border border-line/70 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted/70"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  href={`/projects/${active.slug}`}
                  className="group mt-4 inline-flex items-center gap-1.5 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-cyan"
                >
                  Enter record
                  <ArrowUpRight
                    size={11}
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: sequential artifacts, still not a card grid */}
          <div className="relative md:hidden">
            <div className="border-b border-line px-4 py-3">
              <p className="label text-cyan">Spatial index / list mode</p>
            </div>
            {projects.map((project, index) => (
              <Link
                key={project.slug}
                href={`/projects/${project.slug}`}
                className="group flex items-start gap-4 border-b border-line px-4 py-6 last:border-b-0"
              >
                <span className="mono pt-1 text-[0.5625rem] text-cyan/60">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-lg tracking-tight text-silver">{project.name}</p>
                    <ArrowUpRight size={15} className="shrink-0 text-muted" />
                  </div>
                  <p className="mono mt-1 text-[0.5rem] uppercase tracking-[0.14em] text-muted/60">
                    {project.category} ·{" "}
                    {project.verified ? (
                      <span className="text-mint/80">verified</span>
                    ) : (
                      <span>awaiting verification</span>
                    )}
                  </p>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
                    {project.verified
                      ? project.summary
                      : "Functionality and outcomes are not published yet."}
                  </p>
                  {project.stack.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {project.stack.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="border border-line/70 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted/60"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-4 text-[0.625rem] leading-relaxed text-muted/50">
          Verification standard: a project is marked verified only when its functionality, stack, and
          links have been checked by Somanadh. StudentOS and QEMS are listed because they exist; their
          details are intentionally unpublished.
        </p>
      </div>
    </section>
  );
}
