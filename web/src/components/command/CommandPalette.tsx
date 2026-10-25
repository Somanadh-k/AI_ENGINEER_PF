"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  ArrowUpRight,
  Command,
  CornerDownLeft,
  Download,
  Mail,
  Search,
  Sparkles,
  Terminal as TerminalIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/telemetry";
import type { Profile, Project } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  hint: string;
  group: "Navigate" | "Actions";
  keywords: string;
  run: () => void;
  icon: React.ReactNode;
}

export function CommandPalette({ profile, projects }: { profile: Profile; projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  const ask = (question: string) => {
    close();
    void trackEvent("command_used", { meta: { command: "ask-ai" } });
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("so:assistant-ask", { detail: { question } }));
    }, 220);
  };

  const go = useCallback((href: string) => {
    setOpen(false);
    window.setTimeout(() => {
      if (href.startsWith("#")) {
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = href;
      }
    }, 160);
  }, []);

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: "identity",
        label: "Open identity",
        hint: "#identity",
        group: "Navigate",
        keywords: "about who identity profile introduction",
        run: () => go("#identity"),
        icon: <ArrowRight size={13} />,
      },
      {
        id: "work",
        label: "Explore project universe",
        hint: "#work",
        group: "Navigate",
        keywords: "work projects studentos qems portfolio",
        run: () => go("#work"),
        icon: <ArrowRight size={13} />,
      },
      {
        id: "skills",
        label: "Show technical skills",
        hint: "#skills",
        group: "Navigate",
        keywords: "skills stack technology python fastapi rag agents",
        run: () => go("#skills"),
        icon: <ArrowRight size={13} />,
      },
      {
        id: "experience",
        label: "Open experience timeline",
        hint: "#experience",
        group: "Navigate",
        keywords: "experience internship soopervision timeline ieee",
        run: () => go("#experience"),
        icon: <ArrowRight size={13} />,
      },
      {
        id: "beyond",
        label: "Beyond the code",
        hint: "#beyond",
        group: "Navigate",
        keywords: "human beyond personal principles curiosity",
        run: () => go("#beyond"),
        icon: <ArrowRight size={13} />,
      },
      {
        id: "contact",
        label: "Contact Somanadh",
        hint: "#contact",
        group: "Navigate",
        keywords: "contact email hire reach message",
        run: () => go("#contact"),
        icon: <ArrowRight size={13} />,
      },
      ...projects.map<CommandItem>((project) => ({
        id: `project-${project.slug}`,
        label: `Open ${project.name}`,
        hint: `/projects/${project.slug}`,
        group: "Navigate",
        keywords: `project ${project.name} ${project.category} ${project.stack.join(" ")}`,
        run: () => go(`/projects/${project.slug}`),
        icon: <ArrowRight size={13} />,
      })),
      {
        id: "ask",
        label: "Ask SOMANADH.AI",
        hint: "assistant",
        group: "Actions",
        keywords: "ask ai assistant question chat",
        run: () => {
          close();
          window.setTimeout(() => window.dispatchEvent(new CustomEvent("so:assistant")), 180);
        },
        icon: <Sparkles size={13} />,
      },
      {
        id: "resume",
        label: "Download résumé",
        hint: "PDF",
        group: "Actions",
        keywords: "resume cv download pdf",
        run: () => {
          void trackEvent("resume_download", { meta: { label: "command-palette" } });
          close();
          window.setTimeout(() => {
            window.location.href = profile.resume.path;
          }, 120);
        },
        icon: <Download size={13} />,
      },
      {
        id: "email",
        label: "Email Somanadh",
        hint: profile.email,
        group: "Actions",
        keywords: "email mail contact copy address",
        run: () => {
          close();
          window.setTimeout(() => {
            window.location.href = `mailto:${profile.email}`;
          }, 120);
        },
        icon: <Mail size={13} />,
      },
      {
        id: "linkedin",
        label: "Open LinkedIn",
        hint: "linkedin.com",
        group: "Actions",
        keywords: "linkedin social professional network",
        run: () => {
          close();
          if (profile.links.linkedin) window.open(profile.links.linkedin, "_blank", "noopener");
        },
        icon: <ArrowUpRight size={13} />,
      },
      {
        id: "terminal",
        label: "Open developer terminal",
        hint: "Ctrl + `",
        group: "Actions",
        keywords: "terminal shell console easter egg dev",
        run: () => {
          close();
          window.setTimeout(() => window.dispatchEvent(new CustomEvent("so:terminal")), 180);
        },
        icon: <TerminalIcon size={13} />,
      },
    ];
    return items;
  }, [go, profile.email, profile.links.linkedin, profile.resume.path, projects]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commands;
    const tokens = normalized.split(/\s+/);
    return commands.filter((command) => {
      const haystack = `${command.label} ${command.keywords} ${command.hint}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [commands, query]);

  const askOption = query.trim().length > 2;
  const totalOptions = filtered.length + (askOption ? 1 : 0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("so:command", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("so:command", onOpenEvent);
    };
  }, []);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setQuery("");
      setActive(0);
    }
  };

  const execute = (index: number) => {
    if (index < filtered.length) {
      void trackEvent("command_used", { meta: { command: filtered[index].id } });
      filtered[index].run();
      return;
    }
    if (askOption) ask(query.trim());
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[72] bg-void/75 backdrop-blur-[6px] data-[state=closed]:animate-[fadeOut_.2s_ease] data-[state=open]:animate-[fadeIn_.25s_ease]" />
        <Dialog.Content
          className="fixed left-1/2 top-[14vh] z-[73] w-[min(94vw,38rem)] -translate-x-1/2 border border-line bg-[#0b0d14]/98 shadow-[0_40px_120px_-20px_rgba(0,0,0,.9)] data-[state=closed]:animate-[fadeOut_.2s_ease] data-[state=open]:animate-[paletteIn_.35s_var(--ease-out)]"
          aria-describedby="command-description"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title className="label border-b border-line px-4 py-3 text-cyan">
            What would you like to explore?
          </Dialog.Title>
          <Dialog.Description id="command-description" className="sr-only">
            Search the portfolio, navigate sections, download the résumé, or ask the AI assistant.
          </Dialog.Description>

          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search size={15} className="shrink-0 text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((value) => (totalOptions ? (value + 1) % totalOptions : 0));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((value) => (totalOptions ? (value - 1 + totalOptions) % totalOptions : 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  execute(active);
                } else if (event.key === "Escape") {
                  close();
                }
              }}
              placeholder="Type a command, section, or question…"
              className="h-12 flex-1 bg-transparent text-sm text-silver outline-none placeholder:text-muted/50"
              aria-label="Command search"
              role="combobox"
              aria-expanded
              aria-controls="command-list"
              aria-activedescendant={totalOptions ? `command-option-${active}` : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="mono hidden rounded-sm border border-line px-1.5 py-0.5 text-[0.5625rem] text-muted sm:block">
              ESC
            </kbd>
          </div>

          <div ref={listRef} id="command-list" role="listbox" className="max-h-[52vh] overflow-y-auto py-2">
            {filtered.length === 0 && !askOption && (
              <p className="px-4 py-8 text-center text-sm text-muted">No commands match. Try “skills”.</p>
            )}
            {filtered.map((command, index) => (
              <button
                key={command.id}
                type="button"
                role="option"
                id={`command-option-${index}`}
                aria-selected={active === index}
                data-index={index}
                onMouseEnter={() => setActive(index)}
                onClick={() => execute(index)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  active === index ? "bg-cyan/[0.06]" : "hover:bg-white/[0.02]",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center border",
                    active === index
                      ? "border-cyan/40 bg-cyan/10 text-cyan"
                      : "border-line text-muted",
                  )}
                >
                  {command.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] text-silver">{command.label}</span>
                  <span className="mono block truncate text-[0.5625rem] uppercase tracking-[0.12em] text-muted/60">
                    {command.group} · {command.hint}
                  </span>
                </span>
                {active === index && <CornerDownLeft size={12} className="shrink-0 text-cyan" />}
              </button>
            ))}
            {askOption && (
              <button
                type="button"
                role="option"
                id={`command-option-${filtered.length}`}
                aria-selected={active === filtered.length}
                data-index={filtered.length}
                onMouseEnter={() => setActive(filtered.length)}
                onClick={() => execute(filtered.length)}
                className={cn(
                  "mt-1 flex w-full items-center gap-3 border-t border-line/60 px-4 py-3 text-left transition-colors",
                  active === filtered.length ? "bg-cyan/[0.06]" : "hover:bg-white/[0.02]",
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-violet/40 bg-violet/10 text-violet">
                  <Sparkles size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] text-silver">
                    Ask SOMANADH.AI: “{query.trim()}”
                  </span>
                  <span className="mono block text-[0.5625rem] uppercase tracking-[0.12em] text-muted/60">
                    Grounded in verified records
                  </span>
                </span>
                <CornerDownLeft size={12} className="shrink-0 text-violet" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[0.5625rem] uppercase tracking-[0.14em] text-muted/60">
                <Command size={10} /> K to open
              </span>
              <span className="hidden items-center gap-1.5 text-[0.5625rem] uppercase tracking-[0.14em] text-muted/60 sm:flex">
                <CornerDownLeft size={10} /> to run
              </span>
            </div>
            <span className="mono text-[0.5rem] uppercase tracking-[0.18em] text-muted/40">
              Deterministic first · AI when needed
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
