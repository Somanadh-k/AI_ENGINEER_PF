"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import type {
  BuildLogEntry,
  ExperienceEntry,
  Profile,
  Project,
  SkillCategory,
} from "@/lib/types";
import { cn, formatRange } from "@/lib/utils";

interface Line {
  kind: "input" | "output" | "error" | "system" | "accent";
  text: string;
}

interface TerminalProps {
  profile: Profile;
  skills: SkillCategory[];
  projects: Project[];
  experience: ExperienceEntry[];
  buildLog: BuildLogEntry[];
}

const BANNER: Line[] = [
  { kind: "accent", text: "SOMANADH.OS · developer console v1.0" },
  { kind: "system", text: "Read-only sandbox. Only the commands listed below exist; arbitrary system commands cannot run." },
  { kind: "output", text: 'Type "help" to see what is available, or "exit" to close.' },
];

export function TerminalConsole({ profile, skills, projects, experience, buildLog }: TerminalProps) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "`") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("so:terminal", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("so:terminal", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const print = (next: Line[]) => setLines((prev) => [...prev, ...next]);

  const run = (raw: string) => {
    const command = raw.trim();
    if (!command) return;
    print([{ kind: "input", text: command }]);
    setHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);

    const [name, ...rest] = command.split(/\s+/);
    const arg = rest.join(" ");

    switch (name.toLowerCase()) {
      case "help":
        print([
          {
            kind: "output",
            text: [
              "about        who Somanadh is",
              "skills       technical areas and tools",
              "projects     project records and status",
              "experience   internships and leadership",
              "log          engineering build log",
              "contact      email, LinkedIn, résumé",
              "resume       download the résumé",
              "privacy      how analytics work",
              "whoami       your identity in this session",
              "clear        clear the console",
              "exit         close the console",
            ].join("\n"),
          },
        ]);
        break;
      case "about":
        print([
          { kind: "accent", text: `${profile.name} — ${profile.status}` },
          { kind: "output", text: `${profile.statusDetail}. ${profile.intro}` },
          { kind: "system", text: profile.availability },
        ]);
        break;
      case "skills":
        print(
          skills.flatMap<Line>((category) => [
            { kind: "accent", text: `${category.index} / ${category.label}` },
            {
              kind: "output",
              text: category.skills.map((skill) => `  · ${skill.name}`).join("\n"),
            },
          ]),
        );
        break;
      case "projects":
        print(
          projects.flatMap<Line>((project) => [
            {
              kind: project.verified ? "output" : "system",
              text: `  ${project.name.padEnd(14)} ${project.category.padEnd(16)} ${project.verified ? project.status : "details pending verification"}`,
            },
          ]),
        );
        break;
      case "experience":
        print(
          experience.flatMap<Line>((entry) => [
            {
              kind: "accent",
              text: `${entry.role} · ${entry.org}`,
            },
            {
              kind: "system",
              text: `  ${formatRange(entry.start, entry.end, entry.current)}${entry.type === "Leadership" ? " · leadership" : ""}`,
            },
          ]),
        );
        break;
      case "log":
        print(
          buildLog.map<Line>((entry) => ({
            kind: "output",
            text: `${entry.date}  ${entry.title}\n          ${entry.body}`,
          })),
        );
        break;
      case "contact":
        print([
          { kind: "output", text: `email     ${profile.email}` },
          { kind: "output", text: `linkedin  ${profile.links.linkedin ?? "not published"}` },
          { kind: "output", text: `portfolio ${profile.links.existingPortfolio ?? "—"}` },
          { kind: "output", text: `résumé    ${profile.resume.path}` },
        ]);
        break;
      case "resume":
        print([{ kind: "accent", text: `Opening ${profile.resume.path}` }]);
        window.open(profile.resume.path, "_blank", "noopener");
        break;
      case "privacy":
        print([
          {
            kind: "output",
            text: "Cookie-less analytics, gated by explicit consent. No raw IP storage, no visitor names, no cross-site tracking. Approximate country only when the hosting layer provides it.",
          },
          { kind: "system", text: "Full notice: /privacy" },
        ]);
        break;
      case "whoami":
        print([
          { kind: "output", text: "visitor@somanadh.os" },
          {
            kind: "system",
            text: "Anonymous session. This terminal cannot identify you, and does not try.",
          },
        ]);
        break;
      case "sudo":
        print([
          {
            kind: "error",
            text: `visitor is not in the sudoers file. This incident has been reported to nobody, because this sandbox is read-only.`,
          },
        ]);
        break;
      case "ls":
        print([
          {
            kind: "output",
            text: "identity/   work/   skills/   experience/   beyond/   contact/   privacy/",
          },
        ]);
        break;
      case "date":
        print([{ kind: "output", text: new Date().toString() }]);
        break;
      case "credits":
        print([
          { kind: "output", text: "Concept, content, and direction: Somanadh K" },
          { kind: "output", text: "Frontend: Next.js · Three.js · Motion · Recharts" },
          { kind: "output", text: "Backend: FastAPI · SQLAlchemy · OpenRouter (optional)" },
        ]);
        break;
      case "clear":
        setLines([{ kind: "system", text: "Console cleared." }]);
        break;
      case "exit":
        setOpen(false);
        break;
      case "echo":
        print([{ kind: "output", text: arg }]);
        break;
      default:
        print([
          {
            kind: "error",
            text: `command not found: ${name}. Type "help" for the available commands.`,
          },
        ]);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[74] bg-void/80 backdrop-blur-sm data-[state=closed]:animate-[fadeOut_.2s_ease] data-[state=open]:animate-[fadeIn_.25s_ease]" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-[75] border-t border-cyan/20 bg-[#07080c]/98 shadow-[0_-30px_120px_-20px_rgba(0,229,255,0.18)] data-[state=closed]:animate-[slideDown_.25s_ease] data-[state=open]:animate-[slideUp_.35s_var(--ease-out)]"
          aria-describedby="terminal-description"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="mono text-[0.625rem] uppercase tracking-[0.2em] text-cyan">
              developer terminal
            </span>
            <span className="mono text-[0.5rem] uppercase tracking-[0.16em] text-muted/60">
              read-only · esc to close
            </span>
          </Dialog.Title>
          <Dialog.Description id="terminal-description" className="sr-only">
            A safe, read-only developer terminal for exploring the portfolio. It cannot execute system
            commands.
          </Dialog.Description>

          <div
            ref={scrollRef}
            className="assistant-scroll h-[min(52vh,26rem)] overflow-y-auto px-4 py-4 font-mono text-[0.75rem] leading-relaxed sm:px-6"
            onClick={() => inputRef.current?.focus()}
          >
            <div className="space-y-1.5">
              {lines.map((line, index) => (
                <p
                  key={`${index}-${line.text.slice(0, 12)}`}
                  className={cn(
                    "whitespace-pre-wrap",
                    line.kind === "input" && "text-silver",
                    line.kind === "output" && "text-muted",
                    line.kind === "system" && "text-muted/60",
                    line.kind === "error" && "text-violet",
                    line.kind === "accent" && "text-cyan",
                  )}
                >
                  {line.kind === "input" && (
                    <span className="mr-2 text-mint">visitor@somanadh.os ~ %</span>
                  )}
                  {line.text}
                </p>
              ))}
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              run(value);
              setValue("");
            }}
            className="flex items-center gap-2 border-t border-line px-4 py-3 sm:px-6"
          >
            <span className="mono shrink-0 text-[0.75rem] text-mint">visitor@somanadh.os ~ %</span>
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  if (!history.length) return;
                  const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
                  setHistoryIndex(next);
                  setValue(history[next]);
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  if (historyIndex < 0) return;
                  const next = historyIndex + 1;
                  if (next >= history.length) {
                    setHistoryIndex(-1);
                    setValue("");
                  } else {
                    setHistoryIndex(next);
                    setValue(history[next]);
                  }
                }
              }}
              className="mono h-7 flex-1 bg-transparent text-[0.75rem] text-silver caret-cyan outline-none"
              aria-label="Terminal command"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={120}
            />
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
