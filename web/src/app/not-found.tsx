import Link from "next/link";
import { ArrowLeft, Radar } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-void px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center border border-line bg-graphite/40">
        <Radar size={18} className="text-cyan" />
      </div>
      <p className="label mt-6 text-cyan">Signal lost · 404</p>
      <h1 className="display mt-4 text-[clamp(2.6rem,8vw,5.5rem)] leading-[0.9] text-silver">
        No record at this <span className="serif-accent text-cyan">coordinate</span>.
      </h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
        The page may have moved, or the record has not been published. Nothing here is hidden behind
        a fake loading state.
      </p>
      <Link href="/" className="btn btn-primary mt-7">
        <ArrowLeft size={13} />
        Return to the portfolio
      </Link>
    </div>
  );
}
