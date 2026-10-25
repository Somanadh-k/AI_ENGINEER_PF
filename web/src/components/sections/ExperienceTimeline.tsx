"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Building2 } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Certification, ExperienceEntry } from "@/lib/types";
import { cn, formatRange } from "@/lib/utils";

export function ExperienceTimeline({
  experience,
  certifications,
}: {
  experience: ExperienceEntry[];
  certifications: Certification[];
}) {
  const [activeId, setActiveId] = useState(experience[0]?.id ?? "");
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    experience.forEach((entry) => {
      const node = refs.current[entry.id];
      if (!node) return;
      const observer = new IntersectionObserver(
        (records) => {
          for (const record of records) {
            if (record.isIntersecting) setActiveId(entry.id);
          }
        },
        { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
      );
      observer.observe(node);
      observers.push(observer);
    });
    return () => observers.forEach((observer) => observer.disconnect());
  }, [experience]);

  return (
    <section id="experience" className="section relative border-t border-line">
      <div className="shell">
        <SectionHeading
          index="04"
          eyebrow="Trajectory"
          title={
            <>
              The engineering <span className="serif-accent text-cyan">timeline</span>.
            </>
          }
          description="Two internships and a leadership role, presented with the dates and responsibilities I can verify. No invented outcomes, no inflated titles."
          aside={
            <div className="flex items-center gap-6">
              <div>
                <p className="mono text-2xl text-silver">
                  {String(experience.filter((entry) => entry.type === "Internship").length).padStart(2, "0")}
                </p>
                <p className="label mt-1">Internships</p>
              </div>
              <span className="h-8 w-px bg-line" aria-hidden />
              <div>
                <p className="mono text-2xl text-violet">
                  {String(experience.filter((entry) => entry.type === "Leadership").length).padStart(2, "0")}
                </p>
                <p className="label mt-1">Leadership</p>
              </div>
            </div>
          }
        />

        <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-16">
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <p className="label mb-4">Index</p>
              <nav aria-label="Experience index" className="space-y-1">
                {experience.map((entry) => {
                  const isActive = entry.id === activeId;
                  return (
                    <a
                      key={entry.id}
                      href={`#experience-${entry.id}`}
                      className={cn(
                        "group flex items-start gap-3 border-l py-2.5 pl-3 transition-all",
                        isActive ? "border-cyan" : "border-line hover:border-silver/30",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-1 w-1 shrink-0 rounded-full transition-colors",
                          isActive ? "bg-cyan" : "bg-muted/30",
                        )}
                        aria-hidden
                      />
                      <span>
                        <span
                          className={cn(
                            "block text-[0.75rem] leading-snug transition-colors",
                            isActive ? "text-silver" : "text-muted/70 group-hover:text-silver",
                          )}
                        >
                          {entry.role}
                        </span>
                        <span className="mono mt-1 block text-[0.5rem] uppercase tracking-[0.12em] text-muted/40">
                          {formatRange(entry.start, entry.end, entry.current)}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </nav>
              <div className="mt-8 border-t border-line pt-4">
                <p className="mono text-[0.5rem] uppercase leading-relaxed tracking-[0.14em] text-muted/40">
                  Scroll-spy active
                  <br />
                  Each entry links to its record
                </p>
              </div>
            </div>
          </aside>

          <div className="relative">
            <div aria-hidden className="absolute bottom-0 left-[0.3125rem] top-2 w-px bg-line sm:left-[0.4375rem]" />
            <div className="space-y-12">
              {experience.map((entry, index) => (
                <article
                  key={entry.id}
                  id={`experience-${entry.id}`}
                  ref={(node) => {
                    refs.current[entry.id] = node;
                  }}
                  className="relative scroll-mt-32 pl-7 sm:pl-10"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 top-1.5 flex h-[0.625rem] w-[0.625rem] items-center justify-center rounded-full border sm:h-[0.875rem] sm:w-[0.875rem]",
                      entry.type === "Leadership"
                        ? "border-violet/60 bg-violet/20"
                        : "border-cyan/60 bg-cyan/10",
                    )}
                  >
                    <span
                      className={cn(
                        "h-[0.25rem] w-[0.25rem] rounded-full",
                        entry.type === "Leadership" ? "bg-violet" : "bg-cyan",
                      )}
                    />
                  </span>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="mono text-[0.5625rem] uppercase tracking-[0.16em] text-cyan/80">
                      {formatRange(entry.start, entry.end, entry.current)}
                    </span>
                    <span className="h-2.5 w-px bg-line" aria-hidden />
                    <span className="border border-line px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-muted/60">
                      {entry.type}
                    </span>
                    {entry.current && (
                      <span className="flex items-center gap-1.5 border border-mint/30 px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-mint/90">
                        <span className="live-dot h-1 w-1 rounded-full bg-mint" />
                        Present
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 font-display text-[clamp(1.45rem,2.6vw,2rem)] leading-tight tracking-tight text-silver">
                    {entry.role}
                  </h3>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-muted">
                    <Building2 size={13} className="text-muted/50" aria-hidden />
                    {entry.org}
                    {entry.location && <span className="text-muted/40">· {entry.location}</span>}
                  </p>

                  {entry.summary && (
                    <p className="mt-3 max-w-2xl text-[0.9rem] leading-relaxed text-silver/70">
                      {entry.summary}
                    </p>
                  )}

                  {entry.responsibilities.length > 0 && (
                    <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                      {entry.responsibilities.map((responsibility) => (
                        <li
                          key={responsibility}
                          className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-muted"
                        >
                          <span className="mt-[0.45rem] h-1 w-1 shrink-0 bg-cyan/50" aria-hidden />
                          {responsibility}
                        </li>
                      ))}
                    </ul>
                  )}

                  {entry.technologies.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {entry.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="border border-line/70 px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted/70"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {entry.learnings.length > 0 && (
                    <div className="mt-4 border-l border-line pl-3">
                      <p className="label mb-1">Key learnings</p>
                      {entry.learnings.map((learning) => (
                        <p key={learning} className="text-[0.8125rem] leading-relaxed text-muted">
                          {learning}
                        </p>
                      ))}
                    </div>
                  )}

                  {entry.note && (
                    <p className="mt-4 flex items-start gap-2 text-[0.625rem] leading-relaxed text-muted/50">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted/40" aria-hidden />
                      {entry.note}
                    </p>
                  )}

                  {index === experience.length - 1 && certifications.length === 0 && (
                    <p className="mt-6 flex items-center gap-2 text-[0.625rem] uppercase tracking-[0.14em] text-muted/40">
                      <ArrowUpRight size={11} />
                      More records will be added as they are verified
                    </p>
                  )}
                </article>
              ))}
            </div>

            {certifications.length > 0 && (
              <div className="mt-12 border-t border-line pt-6">
                <p className="label mb-4">Certifications</p>
                <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
                  {certifications.map((certification) => (
                    <div key={certification.id} className="bg-void/80 p-4">
                      <p className="text-sm text-silver">{certification.name}</p>
                      <p className="mt-1 text-xs text-muted">{certification.issuer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
