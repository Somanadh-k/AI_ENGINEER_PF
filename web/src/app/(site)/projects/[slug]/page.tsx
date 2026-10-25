import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleDot,
  Code2,
  Compass,
  FileWarning,
  Layers3,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { TrackedLink } from "@/components/ui/TrackedLink";
import { getPortfolio, getProjectBySlug } from "@/lib/content";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const content = await getPortfolio();
  return content.projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Project not found" };

  const description = project.verified
    ? project.summary ?? project.tagline
    : `${project.name} is a project record on Somanadh K's portfolio. Details are intentionally withheld until verified.`;

  return {
    title: project.name,
    description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: `${project.name} — Somanadh K`,
      description,
      type: "article",
      url: `/projects/${project.slug}`,
    },
    robots: project.verified ? { index: true, follow: true } : { index: false, follow: true },
  };
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/70 py-3">
      <dt className="label">{label}</dt>
      <dd className="text-right font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-silver/80">
        {value}
      </dd>
    </div>
  );
}

function Section({
  index,
  title,
  children,
  className,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={cn("border-t border-line py-10 sm:py-12", className)}>
      <div className="grid gap-5 sm:grid-cols-[8rem_1fr] sm:gap-10">
        <div>
          <p className="label text-cyan">{index}</p>
          <h2 className="mt-2 font-display text-xl tracking-tight text-silver">{title}</h2>
        </div>
        <div className="min-w-0 text-[0.9375rem] leading-[1.8] text-silver/70">{children}</div>
      </div>
    </Reveal>
  );
}

function ListBlock({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden className="mt-[0.65rem] h-1 w-1 shrink-0 rounded-full bg-cyan/70" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function VerifiedProject({ project }: { project: Project }) {
  return (
    <>
      {project.problem && (
        <Section index="01" title="The problem">
          <p>{project.problem}</p>
        </Section>
      )}
      {project.whyItMatters && (
        <Section index="02" title="Why it matters">
          <p>{project.whyItMatters}</p>
        </Section>
      )}
      {project.architecture && (
        <Section index="03" title="Architecture">
          <p>{project.architecture}</p>
        </Section>
      )}
      {project.stack.length > 0 && (
        <Section index="04" title="Stack">
          <div className="flex flex-wrap gap-2">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="border border-line px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-muted"
              >
                {tech}
              </span>
            ))}
          </div>
        </Section>
      )}
      {project.implementation && (
        <Section index="05" title="Implementation">
          <p>{project.implementation}</p>
        </Section>
      )}
      {project.challenges.length > 0 && (
        <Section index="06" title="Hard parts">
          <ListBlock items={project.challenges} />
        </Section>
      )}
      {project.decisions.length > 0 && (
        <Section index="07" title="Decisions">
          <ListBlock items={project.decisions} />
        </Section>
      )}
      {project.screenshots.length > 0 && (
        <Section index="08" title="Evidence">
          <div className="grid gap-4 sm:grid-cols-2">
            {project.screenshots.map((shot) => (
              <figure key={shot.src} className="border border-line bg-void/50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shot.src}
                  alt={shot.alt}
                  loading="lazy"
                  className="aspect-video w-full object-cover"
                />
                {shot.caption && (
                  <figcaption className="px-1 pt-2 font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted/60">
                    {shot.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </Section>
      )}
      {project.lessons.length > 0 && (
        <Section index="09" title="What I learned">
          <ListBlock items={project.lessons} />
        </Section>
      )}
      {project.future.length > 0 && (
        <Section index="10" title="Next">
          <ListBlock items={project.future} />
        </Section>
      )}
    </>
  );
}

function SealedProject({ project }: { project: Project }) {
  return (
    <div className="mt-10 border border-line bg-graphite/30 p-6 sm:p-8">
      <div className="flex items-center gap-2 text-muted">
        <LockKeyhole size={14} />
        <p className="label label-strong">Record sealed pending verification</p>
      </div>
      <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-silver/70">
        {project.note ??
          "The project exists in my working record, but its functionality, stack, outcomes, and links have not been verified for publication. I would rather show an honest placeholder than an impressive fiction."}
      </p>
      <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-3">
        {[
          { icon: <FileWarning size={13} />, label: "Summary", value: "Not published" },
          { icon: <Code2 size={13} />, label: "Stack", value: "Not published" },
          { icon: <Compass size={13} />, label: "Outcomes", value: "Not claimed" },
        ].map((item) => (
          <div key={item.label} className="bg-void/80 p-4">
            <div className="flex items-center gap-2 text-muted/70">{item.icon}</div>
            <p className="label mt-3">{item.label}</p>
            <p className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-muted/50">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const [project, content] = await Promise.all([getProjectBySlug(slug), getPortfolio()]);
  if (!project) notFound();

  const jsonLd = project.verified
    ? {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: project.name,
        description: project.summary ?? project.tagline,
        creator: { "@type": "Person", name: content.profile.name },
        dateCreated: project.year ?? undefined,
        keywords: project.stack.join(", "),
        url: `${content.seo.siteUrl}/projects/${project.slug}`,
      }
    : null;

  return (
    <article className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(55%_55%_at_50%_0%,rgba(0,229,255,0.09),transparent_70%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-fade opacity-20" />

      <div className="shell relative pb-24 pt-32 sm:pt-36">
        <Link
          href="/#work"
          className="group inline-flex items-center gap-2 font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-silver"
        >
          <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-0.5" />
          Back to project universe
        </Link>

        <header className="mt-10 grid gap-10 border-b border-line pb-12 lg:grid-cols-[1.45fr_0.55fr] lg:gap-16">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="label text-cyan">{project.category}</span>
              <span className="h-px w-8 bg-line" aria-hidden />
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.14em]",
                  project.verified ? "border-mint/30 text-mint/90" : "border-line text-muted/60",
                )}
              >
                <CircleDot size={8} />
                {project.verified ? "Verified record" : "Pending verification"}
              </span>
            </div>

            <h1 className="display mt-6 text-[clamp(3.1rem,8.5vw,7.6rem)] leading-[0.86] text-silver">
              {project.name}
            </h1>
            <p className="mt-5 max-w-2xl font-display text-xl leading-snug tracking-tight text-silver/80 sm:text-2xl">
              {project.tagline}
            </p>
            {project.verified && project.summary && (
              <p className="mt-5 max-w-2xl text-[0.9375rem] leading-[1.8] text-muted">
                {project.summary}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {project.live && (
                <TrackedLink
                  href={project.live}
                  external
                  projectSlug={project.slug}
                  event="outbound_click"
                  className="btn btn-primary"
                >
                  Visit live project
                  <ArrowUpRight size={13} />
                </TrackedLink>
              )}
              {project.github && (
                <TrackedLink
                  href={project.github}
                  external
                  projectSlug={project.slug}
                  event="outbound_click"
                  className="btn btn-ghost"
                >
                  Source
                  <ArrowUpRight size={13} />
                </TrackedLink>
              )}
              {!project.live && !project.github && (
                <span className="inline-flex h-12 items-center gap-2 border border-line px-4 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-muted/50">
                  <LockKeyhole size={12} />
                  Links not published
                </span>
              )}
            </div>
          </div>

          <aside className="self-start border border-line bg-graphite/30 p-5">
            <p className="label mb-2 text-cyan">Record metadata</p>
            <dl>
              <MetaRow label="Category" value={project.category} />
              <MetaRow label="Year" value={project.year ?? "Not published"} />
              <MetaRow label="Status" value={project.status} />
              <MetaRow label="Verification" value={project.verified ? "Complete" : "Pending"} />
              <MetaRow label="Stack" value={project.stack.length ? `${project.stack.length} tools` : "Not published"} />
            </dl>
            <div className="mt-5 flex items-start gap-2.5">
              {project.verified ? (
                <Sparkles size={13} className="mt-0.5 shrink-0 text-mint" />
              ) : (
                <LockKeyhole size={13} className="mt-0.5 shrink-0 text-muted" />
              )}
              <p className="text-[0.6875rem] leading-relaxed text-muted/70">
                {project.verified
                  ? "Every claim on this page comes from a verified project record."
                  : "This page intentionally withholds unverified details."}
              </p>
            </div>
          </aside>
        </header>

        {project.verified ? <VerifiedProject project={project} /> : <SealedProject project={project} />}

        {project.note && project.verified && (
          <p className="mt-10 border-l border-cyan/40 pl-4 text-[0.75rem] leading-relaxed text-muted/70">
            {project.note}
          </p>
        )}

        <div className="mt-16 flex flex-col items-start justify-between gap-5 border-t border-line pt-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Layers3 size={14} className="text-cyan" />
            <p className="label label-strong">Next record</p>
          </div>
          <Link href="/#work" className="btn btn-ghost">
            Explore the universe
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
    </article>
  );
}
