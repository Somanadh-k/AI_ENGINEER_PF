import { AudienceIntro } from "@/components/sections/AudienceIntro";
import { Reveal } from "@/components/ui/Reveal";
import type { PortfolioContent } from "@/lib/types";

export function About({ content }: { content: PortfolioContent }) {
  const { profile, audiences, experience, skills } = content;
  const leadership = experience.find((entry) => entry.type === "Leadership");
  const education = profile.education[0];

  return (
    <section id="about" className="section relative">
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <div className="mb-5 flex items-center gap-3">
                <span className="label text-cyan">01 / B</span>
                <span className="h-px w-10 bg-line" aria-hidden />
                <span className="label label-strong">The human</span>
              </div>
              <h2 className="display text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.9] text-silver">
                The <span className="serif-accent text-cyan">human</span>
                <br />
                behind the
                <br />
                intelligence.
              </h2>
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">
                {content.beyond.standfirst} Not a personal brand exercise — a working record of how I
                think, what I have actually done, and where I am going next.
              </p>

              <div className="mt-8 hidden border-t border-line pt-5 lg:block">
                <p className="label mb-3">Working thesis</p>
                <p className="font-display text-lg leading-snug tracking-tight text-silver/80">
                  The model is the easy part.
                  <br />
                  <span className="text-cyan">The system around it is the work.</span>
                </p>
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal delay={80}>
              <div className="space-y-5 text-[0.975rem] leading-[1.85] text-silver/75">
                {profile.about.map((paragraph, index) => (
                  <p
                    key={paragraph.slice(0, 32)}
                    className={
                      index === 0
                        ? "first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-display first-letter:text-[3.6rem] first-letter:leading-[0.72] first-letter:text-cyan"
                        : ""
                    }
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2">
                <div className="bg-void/80 p-4">
                  <p className="label mb-2">Current status</p>
                  <p className="text-sm text-silver">{profile.status}</p>
                  <p className="mt-1 text-xs text-muted">{profile.statusDetail}</p>
                </div>
                <div className="bg-void/80 p-4">
                  <p className="label mb-2">Leadership</p>
                  <p className="text-sm text-silver">{leadership?.role ?? "Not published"}</p>
                  <p className="mt-1 text-xs text-muted">{leadership?.org ?? ""}</p>
                </div>
                <div className="bg-void/80 p-4">
                  <p className="label mb-2">Education</p>
                  <p className="text-sm text-silver">
                    {education ? `${education.degree} · ${education.field}` : "Not published"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {education?.institution ?? education?.note ?? ""}
                  </p>
                </div>
                <div className="bg-void/80 p-4">
                  <p className="label mb-2">Availability</p>
                  <p className="text-sm leading-relaxed text-silver/90">{profile.availability}</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="mt-6 flex flex-wrap gap-1.5">
                {profile.technicalInterests.slice(0, 10).map((interest) => (
                  <span
                    key={interest}
                    className="border border-line/70 px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-muted/80"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={200} className="mt-8">
              <AudienceIntro
                profile={profile}
                audiences={audiences}
                experience={experience}
                skills={skills}
              />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
