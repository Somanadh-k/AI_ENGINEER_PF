import { Assistant } from "@/components/ai/Assistant";
import { CommandPalette } from "@/components/command/CommandPalette";
import { TerminalConsole } from "@/components/easter/TerminalConsole";
import { CinematicIntro } from "@/components/intro/CinematicIntro";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ConsentNotice } from "@/components/system/ConsentNotice";
import { Cursor } from "@/components/system/Cursor";
import { Telemetry } from "@/components/system/Telemetry";
import { getPortfolio } from "@/lib/content";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const content = await getPortfolio();
  const year = new Date().getFullYear();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: content.profile.name,
    jobTitle: "Forward Deployed AI Engineer Intern",
    description: content.profile.intro,
    email: `mailto:${content.profile.email}`,
    url: content.seo.siteUrl,
    sameAs: [
      content.profile.links.linkedin,
      content.profile.links.existingPortfolio,
      content.profile.links.github,
    ].filter(Boolean),
    knowsAbout: content.profile.technicalInterests,
  };

  return (
    <>
      <a
        href="#main"
        className="fixed left-4 top-4 z-[110] -translate-y-24 border border-cyan bg-void px-4 py-2 font-mono text-xs uppercase tracking-widest text-cyan transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      <CinematicIntro />
      <Cursor />
      <Telemetry />
      <SiteHeader name="SOMANADH.OS" />
      <main id="main" className="relative">
        {children}
      </main>
      <SiteFooter profile={content.profile} year={year} />

      <Assistant assistant={content.assistant} />
      <CommandPalette profile={content.profile} projects={content.projects} />
      <TerminalConsole
        profile={content.profile}
        skills={content.skills}
        projects={content.projects}
        experience={content.experience}
        buildLog={content.buildLog}
      />
      <ConsentNotice />

      <noscript>
        <style>{`.reveal{opacity:1!important;transform:none!important}`}</style>
      </noscript>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
