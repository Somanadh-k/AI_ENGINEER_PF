"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Audience, ExperienceEntry, Profile, SkillCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  profile: Profile;
  audiences: Audience[];
  experience: ExperienceEntry[];
  skills: SkillCategory[];
}

function buildLocal(
  audience: Audience["id"],
  profile: Profile,
  experience: ExperienceEntry[],
  skills: SkillCategory[],
): string {
  const ai = experience.find((entry) => entry.role.toLowerCase().includes("forward deployed"));
  const areas = skills.map((category) => category.label).slice(0, 3).join(", ");
  const roleLine = ai
    ? `He has worked as a ${ai.role} at ${ai.org} (${ai.start?.slice(0, 4)}), on AI-powered applications, intelligent workflows, and backend integrations.`
    : "";

  switch (audience) {
    case "recruiter":
      return `${profile.name} is a ${profile.status} and ${profile.statusDetail}. ${roleLine} He also completed a web development internship at SooperVision. His working areas are ${areas}, with Python, FastAPI, SQL and REST APIs at the centre. He is early-career and explicit about that: internship experience, a working portfolio, and room to grow. ${profile.availability}`;
    case "engineer":
      return `Somanadh works where model behaviour meets backend constraints. ${roleLine} His interests sit in agentic workflows, tool calling, and retrieval-augmented generation, and this portfolio is the reference implementation: a Next.js client, FastAPI service, grounded retrieval with citations, streamed answers, and measured analytics. He builds with ${areas.toLowerCase()} and does not claim production scale he has not seen.`;
    case "founder":
      return `Somanadh is an early-career AI engineer with two internships at SooperVision, the second as a Forward Deployed AI Engineer Intern. That meant AI-powered applications, intelligent workflows, backend integrations, and LLM-driven features — the work between a prototype and something a user can rely on. He works in Python and FastAPI, with an interest in automation, agents, and grounded retrieval. He is looking for problems where AI has to survive real users.`;
    case "student":
      return `Somanadh is a B.Tech Computer Science and Engineering student who moved from a web development internship into a Forward Deployed AI Engineer internship at SooperVision. ${roleLine} His path suggests a practical order: learn the backend, then the model, then the system around both. He works with ${areas.toLowerCase()}, and currently chairs the IEEE Society on Social Implications of Technology chapter at his student branch.`;
    default:
      return `${profile.name} is a Computer Science student and AI engineering intern focused on intelligent applications, backend systems, AI agents, and retrieval-augmented generation. ${roleLine} He builds with Python, FastAPI, and SQL, and this site is both his portfolio and a working example of the systems he likes to build. ${profile.availability}`;
  }
}

export function AudienceIntro({ profile, audiences, experience, skills }: Props) {
  const [audience, setAudience] = useState<Audience["id"]>("visitor");
  const [text, setText] = useState(() => buildLocal("visitor", profile, experience, skills));
  const [mode, setMode] = useState<"local" | "openrouter" | "loading">("local");
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const load = useCallback(
    async (next: Audience["id"]) => {
      setAudience(next);
      const cached = cacheRef.current.get(next);
      if (cached) {
        setText(cached);
        setMode("local");
        return;
      }
      const local = buildLocal(next, profile, experience, skills);
      setText(local);
      setMode("loading");
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await fetch("/api/proxy/ai/intro", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ audience: next }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("unavailable");
        const data = (await response.json()) as { text: string; mode: string };
        if (!data.text) throw new Error("empty");
        cacheRef.current.set(next, data.text);
        setText(data.text);
        setMode(data.mode === "openrouter" ? "openrouter" : "local");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setText(local);
        setMode("local");
      }
    },
    [experience, profile, skills],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="relative border border-line bg-graphite/30 p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-cyan">Interpretation layer</p>
          <p className="mt-2 font-display text-lg tracking-tight text-silver">
            Read me as…
          </p>
        </div>
        <p className="mono text-[0.5rem] uppercase tracking-[0.16em] text-muted/50">
          {mode === "openrouter"
            ? "Generated live · OpenRouter"
            : mode === "loading"
              ? "Checking for live model…"
              : "Verified local synthesis"}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Choose an audience">
        {audiences.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => void load(item.id)}
            aria-pressed={audience === item.id}
            title={item.blurb}
            className={cn(
              "border px-3 py-1.5 font-mono text-[0.5625rem] uppercase tracking-[0.16em] transition-all",
              audience === item.id
                ? "border-cyan/60 bg-cyan/10 text-cyan"
                : "border-line text-muted hover:border-silver/30 hover:text-silver",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative mt-5 min-h-[9rem] border-l border-cyan/25 pl-4">
        <p
          key={text}
          className="max-w-3xl animate-[fadeUp_.5s_var(--ease-out)_both] text-[0.9375rem] leading-relaxed text-silver/85"
        >
          {text}
        </p>
        {mode === "loading" && (
          <span className="mt-3 inline-flex items-center gap-2 text-[0.5625rem] uppercase tracking-[0.16em] text-muted/60">
            <span className="h-1 w-1 animate-pulse rounded-full bg-cyan" />
            grounding in portfolio records
          </span>
        )}
      </div>

      <p className="mt-4 text-[0.5625rem] leading-relaxed text-muted/50">
        Generated from the same verified records as the assistant. The model may phrase things
        differently; it is not given permission to invent.
      </p>
    </div>
  );
}
