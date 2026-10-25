import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SystemStatus } from "@/components/system/SystemStatus";
import type { Profile } from "@/lib/types";

const NAV = [
  { label: "Identity", href: "/#identity" },
  { label: "Work", href: "/#work" },
  { label: "Stack", href: "/#skills" },
  { label: "Timeline", href: "/#experience" },
  { label: "Beyond", href: "/#beyond" },
  { label: "Contact", href: "/#contact" },
];

export function SiteFooter({ profile, year }: { profile: Profile; year: number }) {
  const links = profile.links;
  return (
    <footer className="relative overflow-hidden border-t border-line pt-16">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(0,229,255,0.07),transparent_70%)]" />
      <div className="shell relative">
        <div className="grid gap-12 pb-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="label text-cyan">End of transmission</p>
            <p className="display mt-4 max-w-md text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[0.92] text-silver">
              Still <span className="serif-accent text-cyan">becoming</span>.
            </p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
              Built as a working system, not a brochure. The assistant is grounded in verified
              records; the numbers on this site are measured, not decorative.
            </p>
            <div className="mt-7">
              <SystemStatus />
            </div>
          </div>

          <nav aria-label="Footer">
            <p className="label mb-4">Navigate</p>
            <ul className="space-y-2.5">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="link-underline text-sm text-muted transition-colors hover:text-silver"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="label mb-4">Elsewhere</p>
            <ul className="space-y-2.5">
              <li>
                <a
                  href={`mailto:${profile.email}`}
                  className="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-silver"
                >
                  Email
                  <ArrowUpRight size={12} className="transition-transform group-hover:-translate-y-0.5" />
                </a>
              </li>
              {links.linkedin && (
                <li>
                  <a
                    href={links.linkedin}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-silver"
                  >
                    LinkedIn
                    <ArrowUpRight size={12} className="transition-transform group-hover:-translate-y-0.5" />
                  </a>
                </li>
              )}
              {links.github && (
                <li>
                  <a
                    href={links.github}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-silver"
                  >
                    GitHub
                    <ArrowUpRight size={12} className="transition-transform group-hover:-translate-y-0.5" />
                  </a>
                </li>
              )}
              {links.existingPortfolio && (
                <li>
                  <a
                    href={links.existingPortfolio}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-silver"
                  >
                    Earlier portfolio
                    <ArrowUpRight size={12} className="transition-transform group-hover:-translate-y-0.5" />
                  </a>
                </li>
              )}
              <li>
                <Link
                  href="/#contact"
                  className="link-underline text-sm text-muted transition-colors hover:text-silver"
                >
                  Start a conversation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line py-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="mono text-[0.5625rem] uppercase tracking-[0.18em] text-muted/70">
            © {year} Somanadh K · Intelligence, with evidence
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/privacy"
              className="mono text-[0.5625rem] uppercase tracking-[0.18em] text-muted/70 transition-colors hover:text-silver"
            >
              Privacy
            </Link>
            <Link
              href="/admin"
              className="mono text-[0.5625rem] uppercase tracking-[0.18em] text-muted/40 transition-colors hover:text-muted"
            >
              Studio
            </Link>
          </div>
        </div>
      </div>
      <p
        aria-hidden
        className="pointer-events-none select-none whitespace-nowrap text-center font-display text-[clamp(4rem,15vw,13rem)] leading-[0.72] tracking-[-0.06em] text-white/[0.035]"
      >
        SOMANADH
      </p>
    </footer>
  );
}
