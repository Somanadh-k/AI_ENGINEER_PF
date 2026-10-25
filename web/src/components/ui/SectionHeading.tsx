import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  index,
  eyebrow,
  title,
  description,
  aside,
  className,
}: {
  index: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("section-head", className)}>
      <div className="max-w-3xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="label text-cyan">{index}</span>
          <span className="h-px w-10 bg-line" aria-hidden />
          <span className="label label-strong">{eyebrow}</span>
        </div>
        <h2 className="display display-xl text-silver">{title}</h2>
        {description && (
          <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}
