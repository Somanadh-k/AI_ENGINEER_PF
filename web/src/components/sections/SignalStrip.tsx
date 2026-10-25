import type { Profile } from "@/lib/types";

const PHRASES = [
  "FORWARD DEPLOYED AI ENGINEER INTERN",
  "BACKEND ENGINEERING",
  "AGENTIC AI",
  "RETRIEVAL-AUGMENTED GENERATION",
  "PYTHON",
  "FASTAPI",
  "SYSTEMS THAT THINK",
  "VERIFIED, NOT INVENTED",
];

export function SignalStrip({ profile }: { profile: Profile }) {
  return (
    <div className="relative overflow-hidden border-y border-line bg-graphite/30 py-3.5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-void to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-void to-transparent" />
      <div className="marquee-track items-center">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center" aria-hidden={copy === 1}>
            {PHRASES.map((phrase) => (
              <span key={`${copy}-${phrase}`} className="flex items-center">
                <span className="mono whitespace-nowrap px-5 text-[0.5625rem] uppercase tracking-[0.24em] text-muted/70">
                  {phrase}
                </span>
                <span className="text-[0.5rem] text-cyan/40" aria-hidden>
                  ✦
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">
        {profile.name} — {profile.rotatingIdentities.join(", ")}
      </span>
    </div>
  );
}
