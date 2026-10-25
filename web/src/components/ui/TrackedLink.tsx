"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackEvent, type TelemetryEventType } from "@/lib/telemetry";

export function TrackedLink({
  href,
  children,
  className,
  event,
  projectSlug,
  download,
  external,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  event?: TelemetryEventType;
  projectSlug?: string;
  download?: boolean;
  external?: boolean;
  ariaLabel?: string;
}) {
  const onClick = () => {
    if (event) void trackEvent(event, projectSlug ? { projectSlug } : undefined);
  };

  if (external || href.startsWith("http") || href.startsWith("mailto:") || download) {
    return (
      <a
        href={href}
        className={className}
        onClick={onClick}
        aria-label={ariaLabel}
        {...(download ? { download: "" } : {})}
        {...(external || href.startsWith("http")
          ? { target: "_blank", rel: "noreferrer noopener" }
          : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
