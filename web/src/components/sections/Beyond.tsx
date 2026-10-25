import { Reveal } from "@/components/ui/Reveal";
import { NeuralExplorer } from "@/components/sections/NeuralExplorer";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { PortfolioContent } from "@/lib/types";
import { formatMonth } from "@/lib/utils";

export function Beyond({ content }: { content: PortfolioContent }) {
  const { beyond, buildLog } = content;

  return (
    <section id="beyond" className="section relative border-t border-line">
      <div className="shell">
        <SectionHeading
          index="05"
          eyebrow="Human layer"
          title={
            <>
              Beyond the <span className="serif-accent text-cyan">code</span>.
            </>
          }
          description={beyond.standfirst}
          aside={
            <p className="mono max-w-[12rem] text-[0.5625rem] uppercase leading-relaxed tracking-[0.14em] text-muted/50">
              No invented hobbies.
              <br />
              No borrowed personality.
              <br />
              <span className="text-cyan/70">Just the operating system.</span>
            </p>
          }
        />

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <Reveal>
              <div className="space-y-5 text-[0.975rem] leading-[1.85] text-silver/75">
                {beyond.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 28)}>{paragraph}</p>
                ))}
              </div>
            </Reveal>

            <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2">
              {beyond.principles.map((principle, index) => (
                <Reveal key={principle.index} delay={index * 60} className="bg-void/80">
                  <div className="group h-full p-5 transition-colors hover:bg-graphite/40">
                    <p className="mono text-[0.5rem] uppercase tracking-[0.18em] text-cyan/60">
                      {principle.index}
                    </p>
                    <p className="mt-3 font-display text-lg leading-snug tracking-tight text-silver">
                      {principle.title}
                    </p>
                    <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">{principle.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {beyond.interests.length > 0 && (
              <div className="mt-8">
                <p className="label mb-3">Outside the terminal</p>
                <div className="flex flex-wrap gap-1.5">
                  {beyond.interests.map((interest) => (
                    <span
                      key={interest}
                      className="border border-line px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-muted/80"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {beyond.photographs.length > 0 && (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {beyond.photographs.map((photo) => (
                  <figure key={photo.src} className="border border-line bg-graphite/30 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    {photo.caption && (
                      <figcaption className="px-1 pt-2 text-[0.625rem] text-muted/60">
                        {photo.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}

            <div className="mt-10 border-l border-cyan/30 pl-5">
              <p className="font-display text-xl leading-snug tracking-tight text-silver/85">
                “Intelligence is not the hard part to justify —{" "}
                <span className="text-cyan">consequences are.</span>”
              </p>
              <p className="mono mt-2 text-[0.5rem] uppercase tracking-[0.18em] text-muted/50">
                Working note · IEEE SSIT chapter
              </p>
            </div>
          </div>

          <div>
            <Reveal delay={80}>
              <NeuralExplorer />
            </Reveal>

            <div className="mt-8" id="build-log">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="label text-cyan">Build log</p>
                  <p className="mt-1 font-display text-lg tracking-tight text-silver">
                    Learning in public
                  </p>
                </div>
                <p className="mono text-[0.5rem] uppercase tracking-[0.14em] text-muted/40">
                  {buildLog.length} entries
                </p>
              </div>

              <ol className="border-t border-line">
                {buildLog.map((entry) => (
                  <li key={entry.id} className="relative border-b border-line py-4 pl-5">
                    <span
                      className="absolute left-0 top-[1.35rem] h-1 w-1 rounded-full bg-cyan/60"
                      aria-hidden
                    />
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[0.8125rem] text-silver">{entry.title}</p>
                      <time className="mono shrink-0 text-[0.5rem] uppercase tracking-[0.14em] text-muted/50">
                        {formatMonth(entry.date)}
                      </time>
                    </div>
                    <p className="mt-1 text-[0.75rem] leading-relaxed text-muted">{entry.body}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[0.5625rem] leading-relaxed text-muted/40">
                Derived only from verified dates in this profile. Personal stories and interests can be
                added through the private studio.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
