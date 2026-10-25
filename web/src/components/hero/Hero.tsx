import { ArrowDown, ArrowUpRight, Download } from "lucide-react";
import { PortraitFrame } from "@/components/hero/PortraitFrame";
import { RotatingIdentity } from "@/components/hero/RotatingIdentity";
import { NeuralBackdrop } from "@/components/hero/NeuralBackdrop";
import { LiveVisitors } from "@/components/system/LiveVisitors";
import { AiTrigger } from "@/components/ui/AiTrigger";
import { Magnetic } from "@/components/ui/Magnetic";
import { TrackedLink } from "@/components/ui/TrackedLink";
import type { PortfolioContent } from "@/lib/types";

export function Hero({ content }: { content: PortfolioContent }) {
  const { profile, hero } = content;

  return (
    <section
      id="identity"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pb-10 pt-28 sm:pb-14 lg:pt-32"
    >
      <NeuralBackdrop />

      <div className="shell relative z-10">
        <div className="grid items-center gap-14 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 border border-line bg-void/50 px-2.5 py-1.5 backdrop-blur-sm">
                <span className="live-dot h-1 w-1 rounded-full bg-mint" aria-hidden />
                <span className="mono text-[0.5625rem] uppercase tracking-[0.2em] text-muted">
                  Living system · 2026
                </span>
              </span>
              <span className="hidden h-3 w-px bg-line sm:block" aria-hidden />
              <span className="mono text-[0.5625rem] uppercase tracking-[0.2em] text-muted/60">
                {profile.kicker}
              </span>
            </div>

            <h1 className="display display-hero mt-7 flex flex-wrap items-baseline gap-x-4 text-silver">
              <span>SOMANADH</span>
              <span className="relative inline-flex items-baseline">
                <span className="kinetic-outline">K</span>
                <span className="ml-1 h-2 w-2 self-end bg-cyan sm:mb-3" aria-hidden />
              </span>
            </h1>

            <div className="mt-5 flex items-center gap-3">
              <span className="h-px w-10 bg-cyan/60" aria-hidden />
              <RotatingIdentity identities={profile.rotatingIdentities} />
            </div>

            <p className="mt-7 max-w-lg font-display text-[clamp(1.35rem,2.3vw,1.9rem)] leading-[1.2] tracking-[-0.025em] text-silver/90">
              I build systems that <span className="serif-accent text-cyan">think</span> — and the
              infrastructure that keeps them honest.
            </p>

            <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-muted">
              {profile.intro}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Magnetic strength={5}>
                <TrackedLink href={hero.primaryCta.href} className="btn btn-primary group">
                  {hero.primaryCta.label}
                  <ArrowDown
                    size={13}
                    className="transition-transform duration-300 group-hover:translate-y-0.5"
                  />
                </TrackedLink>
              </Magnetic>
              <AiTrigger label={hero.secondaryCta.label} />
              <TrackedLink
                href={profile.resume.path}
                download
                event="resume_download"
                className="group inline-flex h-12 items-center gap-2 px-2 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-silver"
              >
                <Download size={13} className="text-cyan" />
                {hero.resumeCta.label}
                <ArrowUpRight
                  size={11}
                  className="opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </TrackedLink>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-5">
              <LiveVisitors />
              <span className="hidden h-3 w-px bg-line sm:block" aria-hidden />
              <span className="mono text-[0.5625rem] uppercase tracking-[0.16em] text-muted/60">
                Stack <span className="text-silver/80">Python · FastAPI</span>
              </span>
              <span className="hidden h-3 w-px bg-line sm:block" aria-hidden />
              <span className="mono text-[0.5625rem] uppercase tracking-[0.16em] text-muted/60">
                Focus <span className="text-silver/80">Agents + RAG</span>
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute right-0 top-0 z-20 hidden text-right lg:block">
              <p className="label">Identity / 01</p>
              <p className="mono mt-1 text-[0.5rem] uppercase tracking-[0.18em] text-muted/50">
                Human × machine
              </p>
            </div>
            <PortraitFrame
              portrait={profile.portrait}
              labels={hero.portraitLabels}
              name={profile.name}
              initials={profile.initials}
            />
          </div>
        </div>

        <div className="mt-12 flex items-end justify-between gap-6 border-t border-line pt-5 sm:mt-16">
          <div className="flex items-center gap-3">
            <span className="relative h-8 w-px bg-line" aria-hidden>
              <span className="absolute inset-x-0 top-0 h-3 animate-[scrollCue_2.6s_ease-in-out_infinite] bg-cyan" />
            </span>
            <span className="mono text-[0.5rem] uppercase tracking-[0.24em] text-muted/70">
              {hero.scrollCue}
            </span>
          </div>
          <p className="hidden max-w-xs text-right font-mono text-[0.5625rem] uppercase leading-relaxed tracking-[0.14em] text-muted/50 sm:block">
            {profile.tagline}
          </p>
        </div>
      </div>
    </section>
  );
}
