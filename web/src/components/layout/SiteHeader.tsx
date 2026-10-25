"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { LiveVisitors } from "@/components/system/LiveVisitors";
import { Magnetic } from "@/components/ui/Magnetic";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Identity", href: "/#identity", index: "01" },
  { label: "Work", href: "/#work", index: "02" },
  { label: "Stack", href: "/#skills", index: "03" },
  { label: "Timeline", href: "/#experience", index: "04" },
  { label: "Contact", href: "/#contact", index: "05" },
];

export function SiteHeader({ name = "SOMANADH.OS" }: { name?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openAssistant = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("so:assistant"));
  };
  const openCommand = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("so:command"));
  };

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[60] transition-colors duration-500",
          scrolled ? "border-b border-line bg-void/72 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div className="shell flex h-[4.25rem] items-center justify-between gap-4">
          <Link
            href="/"
            className="group flex items-center gap-3"
            aria-label="Somanadh.OS home"
            data-cursor-label="HOME"
          >
            <span className="relative flex h-8 w-8 items-center justify-center border border-line bg-graphite/60">
              <span className="mono text-[0.65rem] font-medium tracking-tight text-silver">SK</span>
              <span className="absolute -right-[2px] -top-[2px] h-1 w-1 bg-cyan" aria-hidden />
            </span>
            <span className="hidden flex-col sm:flex">
              <span className="mono text-[0.6875rem] font-medium leading-none tracking-[0.22em] text-silver">
                {name}
              </span>
              <span className="mono mt-1 text-[0.5rem] leading-none tracking-[0.28em] text-muted">
                LIVING INTELLIGENCE
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-baseline gap-1.5"
              >
                <span className="mono text-[0.5rem] text-muted/50 transition-colors group-hover:text-cyan">
                  {item.index}
                </span>
                <span className="label !tracking-[0.16em] transition-colors group-hover:text-silver">
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LiveVisitors className="mr-1 hidden xl:flex" compact />
            <button
              type="button"
              onClick={openCommand}
              className="hidden h-9 items-center gap-2 border border-line px-2.5 text-muted transition-colors hover:border-cyan/40 hover:text-silver md:flex"
              aria-label="Open command palette"
            >
              <span className="mono text-[0.5625rem] tracking-[0.12em]">⌘K</span>
              <span className="label !text-[0.5rem]">Explore</span>
            </button>
            <Magnetic strength={4} className="hidden sm:block">
              <button type="button" onClick={openAssistant} className="btn btn-primary h-9 px-4">
                Talk to my AI
              </button>
            </Magnetic>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex h-9 w-9 items-center justify-center border border-line text-silver lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-navigation"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-navigation"
        className={cn(
          "fixed inset-0 z-[59] flex flex-col bg-void/97 backdrop-blur-2xl transition-[opacity,visibility] duration-500 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
        aria-hidden={!open}
      >
        <div className="shell flex h-[4.25rem] shrink-0 items-center justify-between">
          <span className="label">Navigation</span>
          <span className="label">{new Date().getFullYear()} · SOMANADH.OS</span>
        </div>
        <nav className="shell flex flex-1 flex-col justify-center gap-1 pb-16" aria-label="Mobile">
          {NAV.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="group flex items-center justify-between border-b border-line py-5"
            >
              <span className="flex items-baseline gap-4">
                <span className="mono text-[0.625rem] text-cyan/70">{item.index}</span>
                <span className="display display-lg !text-3xl text-silver transition-colors group-hover:text-cyan">
                  {item.label}
                </span>
              </span>
              <ArrowUpRight size={18} className="text-muted transition-colors group-hover:text-cyan" />
              <span className="sr-only">{index + 1}</span>
            </Link>
          ))}
        </nav>
        <div className="shell flex shrink-0 items-center justify-between border-t border-line py-5">
          <LiveVisitors />
          <button
            type="button"
            onClick={openAssistant}
            tabIndex={open ? 0 : -1}
            className="btn btn-primary"
          >
            Ask my AI
          </button>
        </div>
      </div>
    </>
  );
}
