import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Database, Eye, LockKeyhole, MessageSquareText, ShieldCheck } from "lucide-react";
import { PrivacyControls } from "@/components/system/PrivacyControls";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How SOMANADH.OS handles analytics, contact messages, AI questions, cookies, and admin sessions.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const SECTIONS = [
  {
    icon: <Eye size={15} />,
    title: "Analytics are opt-in",
    body: [
      "Anonymous analytics are off until you press “Allow anonymous” in the privacy notice. If you decline, no analytics request is sent from this browser.",
      "When enabled, the site stores a random visitor identifier in localStorage and a random session identifier in sessionStorage. These are not cookies, and they are not derived from your name, email, or device fingerprint.",
      "The API records page paths, project views, résumé downloads, contact-button clicks, assistant opens, command-palette use, an approximate device/browser/OS label, a referrer hostname, and a two-letter country code when a hosting CDN supplies one. It does not store raw IP addresses.",
    ],
  },
  {
    icon: <Database size={15} />,
    title: "Retention",
    body: [
      "Aggregated analytics events are retained for up to 400 days by default. Visitor sessions are counted as active only during a 60-second window; the site sends a heartbeat every 25 seconds while the tab is visible.",
      "The exact retention period is a server configuration value. There is no public profile, advertising network, cross-site tracker, or sale of data.",
    ],
  },
  {
    icon: <MessageSquareText size={15} />,
    title: "Contact messages",
    body: [
      "If you submit the contact form, your name, email address, subject, message, source page, and submission time are stored in a private database so Somanadh can reply. The form is rate limited and server validated.",
      "Messages are not published. They are not sent to an email provider unless that integration is configured by the operator. You can ask for a message to be deleted by emailing skollavajjala@gmail.com from the address used to send it.",
    ],
  },
  {
    icon: <ShieldCheck size={15} />,
    title: "The AI assistant",
    body: [
      "Questions sent to SOMANADH.AI are processed by the API and stored with the assistant mode, latency, token counts, and source titles so the owner can measure quality. No visitor identifier is attached to an assistant question by the current frontend.",
      "When OpenRouter is configured, the conversation and retrieved portfolio context are sent to the configured model provider so it can generate a response. When it is not configured, answers are assembled locally from the same verified records and clearly labelled as local grounded mode.",
      "Do not paste sensitive personal information into the assistant. It is a portfolio guide, not a private support channel.",
    ],
  },
  {
    icon: <LockKeyhole size={15} />,
    title: "Cookies and the admin studio",
    body: [
      "The public site sets no analytics cookies. The private /admin area uses one HttpOnly, SameSite=Lax session cookie after a password login. It is marked Secure in production. The cookie is not readable by JavaScript and expires after the configured admin session window.",
      "Uploaded portraits and résumés are served from the API's /media route. They are public assets once referenced by the portfolio; do not upload anything you would not want a visitor to see.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="shell relative pb-24 pt-32 sm:pt-36">
      <Link
        href="/"
        className="group inline-flex items-center gap-2 font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-silver"
      >
        <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-0.5" />
        Return home
      </Link>

      <header className="mt-10 max-w-3xl border-b border-line pb-10">
        <p className="label text-cyan">Privacy note</p>
        <h1 className="display mt-5 text-[clamp(2.8rem,7vw,5.8rem)] leading-[0.9] text-silver">
          Evidence, not <span className="serif-accent text-cyan">surveillance</span>.
        </h1>
        <p className="mt-6 text-[0.9375rem] leading-[1.8] text-muted">
          This site measures whether the work is being read. It is designed to do that without
          cookies, raw IP storage, advertising pixels, or individual profiles. This page describes
          exactly what runs in the code in this repository.
        </p>
      </header>

      <div className="mt-8 max-w-3xl">
        <PrivacyControls />
      </div>

      <div className="mt-12 max-w-3xl">
        {SECTIONS.map((section, index) => (
          <section key={section.title} className="border-t border-line py-8 first:border-t-0 first:pt-0">
            <div className="flex items-start gap-3">
              <span className="mt-1 text-cyan">{section.icon}</span>
              <div>
                <p className="label text-muted/60">{String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-1 font-display text-xl tracking-tight text-silver">{section.title}</h2>
                <div className="mt-4 space-y-3 text-[0.875rem] leading-[1.8] text-silver/70">
                  {section.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 max-w-3xl border border-line bg-graphite/30 p-5">
        <p className="label text-cyan">Contact</p>
        <p className="mt-3 text-[0.875rem] leading-relaxed text-muted">
          Questions or deletion requests:{" "}
          <a
            href="mailto:skollavajjala@gmail.com"
            className="text-silver underline underline-offset-2 hover:text-cyan"
          >
            skollavajjala@gmail.com
          </a>
          . This is a personal portfolio, not a company service.
        </p>
        <p className="mt-4 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-muted/50">
          Last reviewed · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
