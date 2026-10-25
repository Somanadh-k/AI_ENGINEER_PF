"use client";

import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Project, Skill, SkillCategory } from "@/lib/types";
import { CATEGORY_TONE, cn } from "@/lib/utils";

const HUBS = [
  { angle: -90, x: 50, y: 12 },
  { angle: 0, x: 88, y: 50 },
  { angle: 90, x: 50, y: 88 },
  { angle: 180, x: 12, y: 50 },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function SkillConstellation({
  categories,
  toolkit,
  projects,
}: {
  categories: SkillCategory[];
  toolkit: string[];
  projects: Project[];
}) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "");
  const [activeSkillId, setActiveSkillId] = useState(categories[0]?.skills[0]?.id ?? "");

  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) ?? categories[0];
  const activeSkill =
    activeCategory?.skills.find((skill) => skill.id === activeSkillId) ??
    activeCategory?.skills[0];

  const hubPositions = useMemo(
    () =>
      categories.map((category, index) => ({
        category,
        ...(HUBS[index % HUBS.length] ?? HUBS[0]),
      })),
    [categories],
  );

  const skillPositions = useMemo(() => {
    if (!activeCategory) return [];
    const hub = hubPositions.find((item) => item.category.id === activeCategory.id) ?? hubPositions[0];
    const count = activeCategory.skills.length;
    const spread = 72;
    return activeCategory.skills.map((skill, index) => {
      const offset = count === 1 ? 0 : (index / (count - 1) - 0.5) * spread;
      const angle = (hub.angle + offset) * (Math.PI / 180);
      return {
        skill,
        x: clamp(50 + Math.cos(angle) * 41, 14, 86),
        y: clamp(50 + Math.sin(angle) * 36, 18, 82),
      };
    });
  }, [activeCategory, hubPositions]);

  const tone = CATEGORY_TONE[activeCategory?.color ?? "cyan"] ?? CATEGORY_TONE.cyan;

  if (!categories.length) return null;

  const relatedProjects = (activeSkill?.relatedProjects ?? [])
    .map((slug) => projects.find((project) => project.slug === slug))
    .filter((project): project is Project => Boolean(project));

  return (
    <section id="skills" className="section relative border-t border-line">
      <div className="shell">
        <SectionHeading
          index="03"
          eyebrow="The engineering mind"
          title={
            <>
              A constellation, not a <span className="serif-accent text-cyan">scoreboard</span>.
            </>
          }
          description="No percentages, no invented proficiency levels. Four working areas, expanded into the technologies and concepts I can actually speak to — with the evidence attached."
          aside={
            <p className="mono max-w-[13rem] text-[0.5625rem] uppercase leading-relaxed tracking-[0.14em] text-muted/50">
              Hover a node
              <br />
              read the record
              <br />
              <span className="text-cyan/70">no proficiency theatre</span>
            </p>
          }
        />

        <div className="border border-line bg-[#0a0c12]">
          <div className="flex flex-wrap gap-px border-b border-line bg-line">
            {categories.map((category) => {
              const isActive = category.id === activeCategory?.id;
              const categoryTone = CATEGORY_TONE[category.color] ?? CATEGORY_TONE.cyan;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(category.id);
                    setActiveSkillId(category.skills[0]?.id ?? "");
                  }}
                  aria-pressed={isActive}
                  className={cn(
                    "group flex flex-1 basis-1/2 items-center gap-2.5 bg-void px-3 py-3.5 text-left transition-colors sm:basis-auto",
                    isActive ? "bg-graphite/80" : "hover:bg-graphite/40",
                  )}
                >
                  <span className={cn("mono text-[0.5rem]", isActive ? categoryTone.text : "text-muted/40")}>
                    {category.index}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[0.5625rem] uppercase tracking-[0.12em] transition-colors",
                      isActive ? "text-silver" : "text-muted/70 group-hover:text-silver",
                    )}
                  >
                    {category.label}
                  </span>
                  <span
                    className={cn(
                      "ml-auto h-1 w-1 rounded-full",
                      isActive ? categoryTone.dot : "bg-white/10",
                    )}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-[1.35fr_1fr]">
            <div className="relative hidden min-h-[30rem] overflow-hidden border-b border-line lg:block lg:border-b-0 lg:border-r">
              <div aria-hidden className="absolute inset-0 grid-fade opacity-30" />
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,229,255,0.06),transparent_70%)]"
              />
              <svg className="absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none">
                {hubPositions.map(({ category, x, y }) => (
                  <line
                    key={`hub-line-${category.id}`}
                    x1="50%"
                    y1="50%"
                    x2={`${x}%`}
                    y2={`${y}%`}
                    stroke={
                      category.id === activeCategory?.id
                        ? "rgba(0,229,255,0.25)"
                        : "rgba(220,229,242,0.07)"
                    }
                    strokeWidth="0.6"
                    strokeDasharray={category.id === activeCategory?.id ? undefined : "2 5"}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {skillPositions.map(({ skill, x, y }) => (
                  <line
                    key={`skill-line-${skill.id}`}
                    x1={`${hubPositions.find((hub) => hub.category.id === activeCategory?.id)?.x ?? 50}%`}
                    y1={`${hubPositions.find((hub) => hub.category.id === activeCategory?.id)?.y ?? 50}%`}
                    x2={`${x}%`}
                    y2={`${y}%`}
                    stroke={
                      skill.id === activeSkill?.id ? "rgba(0,229,255,0.35)" : "rgba(220,229,242,0.08)"
                    }
                    strokeWidth="0.6"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>

              <div className="absolute left-1/2 top-1/2 w-40 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="mono text-[0.45rem] uppercase tracking-[0.22em] text-muted/50">
                  The engineering
                </p>
                <p className="display mt-1 text-3xl text-silver">Mind</p>
                <p className="mono mt-2 text-[0.45rem] uppercase tracking-[0.16em] text-cyan/50">
                  {categories.length} areas ·{" "}
                  {categories.reduce((total, category) => total + category.skills.length, 0)} nodes
                </p>
              </div>

              {hubPositions.map(({ category, x, y }) => {
                const isActive = category.id === activeCategory?.id;
                const categoryTone = CATEGORY_TONE[category.color] ?? CATEGORY_TONE.cyan;
                return (
                  <button
                    key={`hub-${category.id}`}
                    type="button"
                    onClick={() => {
                      setActiveCategoryId(category.id);
                      setActiveSkillId(category.skills[0]?.id ?? "");
                    }}
                    className={cn(
                      "absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center border backdrop-blur-sm transition-all",
                      isActive
                        ? "border-cyan/50 bg-void/95 text-silver shadow-[0_0_24px_-6px_rgba(0,229,255,.5)]"
                        : "border-line bg-void/70 text-muted/60 hover:border-silver/30 hover:text-silver",
                    )}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    aria-label={`${category.label} (${category.index})`}
                    title={category.label}
                    aria-pressed={isActive}
                  >
                    <span className={cn("mono text-[0.5rem]", isActive ? categoryTone.text : "text-muted/50")}>
                      {category.index}
                    </span>
                  </button>
                );
              })}

              {skillPositions.map(({ skill, x, y }) => {
                const isActive = skill.id === activeSkill?.id;
                return (
                  <button
                    key={`skill-${skill.id}`}
                    type="button"
                    onMouseEnter={() => setActiveSkillId(skill.id)}
                    onFocus={() => setActiveSkillId(skill.id)}
                    onClick={() => setActiveSkillId(skill.id)}
                    className={cn(
                      "group absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-300",
                      isActive ? "bg-cyan/[0.08]" : "hover:bg-white/[0.04]",
                    )}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    aria-label={skill.name}
                    title={skill.name}
                    aria-pressed={isActive}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-all",
                        isActive
                          ? "scale-125 bg-cyan shadow-[0_0_12px_3px_rgba(0,229,255,.45)]"
                          : "bg-muted/45 group-hover:bg-silver/70",
                      )}
                      aria-hidden
                    />
                  </button>
                );
              })}

              <p className="absolute bottom-4 left-4 mono text-[0.45rem] uppercase tracking-[0.16em] text-muted/40">
                {activeCategory?.summary}
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={cn("label", tone.text)}>{activeCategory?.label}</p>
                  <h3 className="mt-2 font-display text-2xl tracking-tight text-silver">
                    {activeSkill?.name}
                  </h3>
                  <p className="mono mt-1 text-[0.5rem] uppercase tracking-[0.16em] text-muted/50">
                    {activeSkill?.kind} · verified association
                  </p>
                </div>
                <span className={cn("mt-1 h-2 w-2 rounded-full", tone.dot)} aria-hidden />
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="label mb-1.5">What it is</p>
                  <p className="text-[0.8125rem] leading-relaxed text-muted">{activeSkill?.what}</p>
                </div>
                <div>
                  <p className="label mb-1.5">How I use it</p>
                  <p className="text-[0.8125rem] leading-relaxed text-silver/80">{activeSkill?.how}</p>
                </div>
              </div>

              {relatedProjects.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <p className="label mb-2">Evidence</p>
                  <div className="flex flex-wrap gap-1.5">
                    {relatedProjects.map((project) => (
                      <Link
                        key={project.slug}
                        href={`/projects/${project.slug}`}
                        className="inline-flex items-center gap-1 border border-line px-2 py-1 text-[0.5625rem] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/40 hover:text-cyan"
                      >
                        {project.name}
                        <ArrowUpRight size={9} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 border-t border-line pt-4">
                <p className="label mb-2">Expand the area</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeCategory?.skills.map((skill: Skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => setActiveSkillId(skill.id)}
                      className={cn(
                        "border px-2 py-1 text-[0.5625rem] uppercase tracking-[0.1em] transition-colors",
                        skill.id === activeSkill?.id
                          ? "border-cyan/40 text-cyan"
                          : "border-line text-muted/70 hover:text-silver",
                      )}
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile accordion */}
          <div className="lg:hidden">
            {categories.map((category) => {
              const categoryTone = CATEGORY_TONE[category.color] ?? CATEGORY_TONE.cyan;
              return (
                <details key={category.id} className="group border-t border-line">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4">
                    <span className={cn("mono text-[0.5rem]", categoryTone.text)}>{category.index}</span>
                    <span className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-silver">
                      {category.label}
                    </span>
                    <span className="ml-auto mono text-[0.5rem] text-muted/40">
                      {category.skills.length} nodes
                    </span>
                    <Plus size={13} className="text-muted transition-transform group-open:rotate-45" />
                  </summary>
                  <div className="px-4 pb-4">
                    <p className="mb-3 text-[0.75rem] leading-relaxed text-muted">{category.summary}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {category.skills.map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => {
                            setActiveCategoryId(category.id);
                            setActiveSkillId(skill.id);
                            document.getElementById("skill-detail-mobile")?.scrollIntoView({
                              behavior: "smooth",
                              block: "nearest",
                            });
                          }}
                          className="border border-line px-2.5 py-1.5 text-[0.5625rem] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/40 hover:text-cyan"
                        >
                          {skill.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </details>
              );
            })}
            <div id="skill-detail-mobile" className="border-t border-line bg-graphite/30 p-4">
              <p className={cn("label", tone.text)}>
                {activeCategory?.label} / {activeSkill?.name}
              </p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">{activeSkill?.what}</p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-silver/80">{activeSkill?.how}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="label">Toolkit</span>
          <span className="h-3 w-px bg-line" aria-hidden />
          {toolkit.map((tool) => (
            <span key={tool} className="mono text-[0.5625rem] uppercase tracking-[0.14em] text-muted/70">
              {tool}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
