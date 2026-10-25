import { ArrowUpRight, Download, Mail } from "lucide-react";
import { ContactForm } from "@/components/sections/ContactForm";
import { AiTrigger } from "@/components/ui/AiTrigger";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TrackedLink } from "@/components/ui/TrackedLink";
import { SystemStatus } from "@/components/system/SystemStatus";
import type { Profile } from "@/lib/types";

export function Contact({ profile }: { profile: Profile }) {
  const { links } = profile;

  return (
    <section id="contact" className="section relative overflow-hidden border-t border-line">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/2 h-96 w-[70%] -translate-x-1/2 rounded-full bg-cyan/[0.05] blur-[100px]"
      />
      <div className="shell relative">
        <SectionHeading
          index="06"
          eyebrow="Open channel"
          title={
            <>
              Let&apos;s build something{" "}
              <span className="serif-accent text-cyan">intelligent</span>.
            </>
          }
          description="A role, a hard problem, or a system that needs grounding — I read everything that arrives. The assistant can answer the obvious questions first."
          aside={<AiTrigger label="Ask before you write" variant="outline" />}
        />

        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="label mb-3">Direct line</p>
            <TrackedLink
              href={`mailto:${profile.email}`}
              event="contact_click"
              className="group inline-flex max-w-full items-start gap-3"
            >
              <Mail size={18} className="mt-1.5 shrink-0 text-cyan" />
              <span className="break-all font-display text-[clamp(1.35rem,3.4vw,2.1rem)] leading-tight tracking-[-0.03em] text-silver transition-colors group-hover:text-cyan">
                {profile.email}
              </span>
            </TrackedLink>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {profile.availability}
            </p>

            <div className="mt-7 border-t border-line">
              {links.linkedin && (
                <TrackedLink
                  href={links.linkedin}
                  external
                  event="contact_click"
                  className="group flex items-center justify-between gap-4 border-b border-line py-3.5"
                >
                  <span>
                    <span className="label mb-1 block">LinkedIn</span>
                    <span className="text-sm text-muted transition-colors group-hover:text-silver">
                      /in/somanadh-k
                    </span>
                  </span>
                  <ArrowUpRight size={15} className="text-muted transition-all group-hover:-translate-y-0.5 group-hover:text-cyan" />
                </TrackedLink>
              )}
              {links.existingPortfolio && (
                <TrackedLink
                  href={links.existingPortfolio}
                  external
                  className="group flex items-center justify-between gap-4 border-b border-line py-3.5"
                >
                  <span>
                    <span className="label mb-1 block">Earlier portfolio</span>
                    <span className="text-sm text-muted transition-colors group-hover:text-silver">
                      somanadh-k.github.io
                    </span>
                  </span>
                  <ArrowUpRight size={15} className="text-muted transition-all group-hover:-translate-y-0.5 group-hover:text-cyan" />
                </TrackedLink>
              )}
              <TrackedLink
                href={profile.resume.path}
                download
                event="resume_download"
                className="group flex items-center justify-between gap-4 border-b border-line py-3.5"
              >
                <span>
                  <span className="label mb-1 block">Résumé</span>
                  <span className="text-sm text-muted transition-colors group-hover:text-silver">
                    One-page PDF · verified content
                  </span>
                </span>
                <Download size={15} className="text-muted transition-colors group-hover:text-cyan" />
              </TrackedLink>
            </div>

            <div className="mt-7 border border-line bg-graphite/20 p-4">
              <p className="label mb-2">System state</p>
              <SystemStatus compact />
              <p className="mt-3 text-[0.5625rem] leading-relaxed text-muted/50">
                Status is fetched from the live API. If it reads “static mode”, the portfolio content is
                still fully available — only the assistant and analytics go offline.
              </p>
            </div>
          </div>

          <ContactForm profile={profile} />
        </div>
      </div>
    </section>
  );
}
