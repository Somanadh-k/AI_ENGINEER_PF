"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowUpRight,
  Check,
  Copy,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { trackEvent } from "@/lib/telemetry";
import type { AssistantContent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Source {
  title: string;
  href: string;
  snippet?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  mode?: string;
  model?: string | null;
  error?: string | null;
  stopped?: boolean;
}

interface AssistantProps {
  assistant: AssistantContent;
}

type StreamEvent = { event: string; data: Record<string, unknown> };

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_#>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

async function consumeSSE(
  response: Response,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  if (!response.body) throw new Error("Streaming is unavailable in this browser.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      let event = "message";
      const dataLines: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;
      try {
        onEvent({ event, data: JSON.parse(dataLines.join("\n")) });
      } catch {
        /* ignore malformed frames rather than killing the stream */
      }
    }
  }
}

export function Assistant({ assistant }: AssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [mode, setMode] = useState<string>("unknown");
  const [model, setModel] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSpokenRef = useRef<string | null>(null);

  const speechSupported =
    mounted && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const synthesisSupported = mounted && "speechSynthesis" in window;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("so:assistant", onOpen);
    return () => window.removeEventListener("so:assistant", onOpen);
  }, []);

  useEffect(() => {
    if (open) {
      void trackEvent("ai_open");
      const timer = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
    abortRef.current?.abort();
    recognitionRef.current?.stop();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, [open]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(plainText(text).slice(0, 1200));
    utterance.rate = 1.02;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || streaming) return;
      stopSpeaking();
      setInput("");
      setVoiceError(null);

      const userMessage: Message = { id: uid(), role: "user", content: question };
      const assistantId = uid();
      const history = [...messages, userMessage].slice(-8).map(({ role, content }) => ({
        role,
        content,
      }));

      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantId, role: "assistant", content: "", sources: [], error: null },
      ]);
      setStreaming(true);
      void trackEvent("ai_message");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/proxy/ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let detail = "The assistant is unavailable right now.";
          try {
            const payload = (await response.json()) as { detail?: string };
            if (payload.detail) detail = payload.detail;
          } catch {
            /* ignore */
          }
          throw new Error(detail);
        }

        await consumeSSE(response, ({ event, data }) => {
          if (event === "meta") {
            setMode(String(data.mode ?? "unknown"));
            setModel((data.model as string | null) ?? null);
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? { ...message, sources: (data.sources as Source[]) ?? [] }
                  : message,
              ),
            );
          } else if (event === "delta") {
            const text = String(data.text ?? "");
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + text }
                  : message,
              ),
            );
          } else if (event === "error") {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? { ...message, error: String(data.message ?? "Provider error") }
                  : message,
              ),
            );
          }
        });
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  stopped: aborted,
                  error: aborted
                    ? null
                    : error instanceof Error
                      ? error.message
                      : "The assistant is unavailable right now.",
                  content:
                    message.content ||
                    (aborted
                      ? "Stopped."
                      : "I couldn't complete that request. The verified sections above still answer most questions — or email Somanadh directly."),
                }
              : message,
          ),
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, stopSpeaking, streaming],
  );

  // Speak completed answers when the visitor opted in.
  useEffect(() => {
    if (!voiceReplies || !synthesisSupported) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.content || streaming) return;
    if (lastSpokenRef.current === last.id) return;
    lastSpokenRef.current = last.id;
    speak(last.content);
  }, [messages, speak, streaming, synthesisSupported, voiceReplies]);

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    setVoiceError(null);
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceError("Voice input isn't supported in this browser. Chrome or Edge works best — text always works.");
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      let finalTranscript = "";

      recognition.onstart = () => setListening(true);
      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) finalTranscript += result[0].transcript;
          else interim += result[0].transcript;
        }
        setInput(finalTranscript || interim);
      };
      recognition.onerror = (event) => {
        setListening(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setVoiceError("Microphone permission was declined. You can still type your question.");
        } else if (event.error === "no-speech") {
          setVoiceError("I didn't catch that. Try again or type your question.");
        } else {
          setVoiceError("Voice input stopped unexpectedly. Text input is unaffected.");
        }
      };
      recognition.onend = () => {
        setListening(false);
        recognitionRef.current = null;
        const transcript = finalTranscript.trim();
        if (transcript) void send(transcript);
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setListening(false);
      setVoiceError("The microphone could not be started. Check your browser permissions.");
    }
  };

  const copy = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      /* clipboard may be blocked */
    }
  };

  // Command palette can hand the assistant a natural-language question.
  useEffect(() => {
    const onAsk = (event: Event) => {
      const question = (event as CustomEvent<{ question?: string }>).detail?.question;
      if (!question) return;
      setOpen(true);
      window.setTimeout(() => void send(question), 420);
    };
    window.addEventListener("so:assistant-ask", onAsk);
    return () => window.removeEventListener("so:assistant-ask", onAsk);
  }, [send]);

  const openSource = (href: string) => {
    setOpen(false);
    window.setTimeout(() => {
      if (href.startsWith("#")) {
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = href;
      }
    }, 220);
  };

  const hasConversation = messages.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="group fixed bottom-5 right-5 z-[58] flex h-12 items-center gap-2.5 overflow-hidden border border-cyan/40 bg-void/85 px-4 text-silver shadow-[0_16px_60px_-10px_rgba(0,229,255,0.35)] backdrop-blur-xl transition-all hover:border-cyan hover:bg-cyan hover:text-void sm:bottom-7 sm:right-7"
          aria-label="Talk to Somanadh's AI assistant"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-cyan live-dot group-hover:bg-void" />
          </span>
          <span className="mono text-[0.625rem] uppercase tracking-[0.18em]">Talk to my AI</span>
          <Sparkles size={13} className="text-cyan transition-colors group-hover:text-void" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-void/60 backdrop-blur-[3px] data-[state=closed]:animate-[fadeOut_.25s_ease] data-[state=open]:animate-[fadeIn_.3s_ease]" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-[71] flex h-[92svh] flex-col border border-line bg-[#0a0c12]/98 shadow-[0_0_120px_-20px_rgba(0,229,255,0.25)] backdrop-blur-2xl data-[state=closed]:animate-[slideDown_.25s_ease] data-[state=open]:animate-[slideUp_.4s_var(--ease-out)] sm:inset-y-3 sm:left-auto sm:right-3 sm:h-auto sm:max-h-[calc(100svh-1.5rem)] sm:w-[min(30rem,calc(100vw-1.5rem))] sm:border-line"
          aria-describedby="assistant-description"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <Dialog.Title className="flex items-center gap-2 font-display text-lg tracking-tight text-silver">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-mint live-dot" />
                </span>
                SOMANADH.AI
              </Dialog.Title>
              <p id="assistant-description" className="mt-0.5 text-[0.6875rem] text-muted">
                {streaming
                  ? "Composing an answer from verified records…"
                  : mode === "openrouter"
                    ? `Live · ${model ?? "OpenRouter"}`
                    : mode === "fallback" || mode === "fallback-degraded"
                      ? "Local grounded mode · verified records only"
                      : assistant.tagline}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {synthesisSupported && (
                <button
                  type="button"
                  onClick={() => {
                    if (voiceReplies) stopSpeaking();
                    setVoiceReplies((value) => !value);
                  }}
                  aria-pressed={voiceReplies}
                  aria-label={voiceReplies ? "Disable spoken replies" : "Enable spoken replies"}
                  title={voiceReplies ? "Spoken replies on" : "Spoken replies off"}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center border border-transparent text-muted transition-colors hover:border-line hover:text-silver",
                    voiceReplies && "text-cyan",
                  )}
                >
                  {voiceReplies ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
              )}
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close assistant"
                  className="flex h-8 w-8 items-center justify-center border border-transparent text-muted transition-colors hover:border-line hover:text-silver"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div ref={scrollRef} className="assistant-scroll flex-1 overflow-y-auto px-4 py-5 sm:px-5">
            {!hasConversation && (
              <div className="flex h-full flex-col justify-center">
                <p className="label mb-3 text-cyan">Grounded intelligence</p>
                <p className="max-w-sm font-display text-2xl leading-tight tracking-tight text-silver">
                  Ask me about the work, the stack, or the person behind it.
                </p>
                <p className="mt-3 max-w-sm text-[0.8125rem] leading-relaxed text-muted">
                  {assistant.greeting}
                </p>
                <div className="mt-6 space-y-2">
                  {assistant.suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void send(question)}
                      className="group flex w-full items-center justify-between gap-3 border border-line bg-graphite/40 px-3 py-2.5 text-left text-[0.8125rem] text-muted transition-all hover:border-cyan/35 hover:bg-cyan/[0.04] hover:text-silver"
                    >
                      <span>{question}</span>
                      <ArrowUpRight
                        size={13}
                        className="shrink-0 text-muted/50 transition-all group-hover:-translate-y-0.5 group-hover:text-cyan"
                      />
                    </button>
                  ))}
                </div>
                <p className="mt-5 text-[0.625rem] leading-relaxed text-muted/60">
                  {assistant.disclaimer}
                </p>
              </div>
            )}

            <div className="space-y-5">
              {messages.map((message) => (
                <div key={message.id} className={cn("flex flex-col", message.role === "user" && "items-end")}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="label !text-[0.5rem] !tracking-[0.18em]">
                      {message.role === "user" ? "You" : "SOMANADH.AI"}
                    </span>
                    {message.role === "assistant" && message.mode && (
                      <span className="mono text-[0.5rem] uppercase tracking-[0.14em] text-muted/50">
                        {message.mode === "openrouter" ? "live" : "grounded"}
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[92%] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed",
                      message.role === "user"
                        ? "border border-cyan/25 bg-cyan/[0.07] text-silver"
                        : "border border-line bg-graphite/60 text-silver/90",
                    )}
                  >
                    {message.role === "assistant" ? (
                      message.content ? (
                        <div className="assistant-prose">
                          <Markdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => (
                                <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
                              ),
                              li: ({ children }) => <li className="marker:text-cyan/60">{children}</li>,
                              strong: ({ children }) => (
                                <strong className="font-semibold text-silver">{children}</strong>
                              ),
                              code: ({ children }) => (
                                <code className="mono rounded-sm bg-white/5 px-1 py-0.5 text-[0.75em] text-mint">
                                  {children}
                                </code>
                              ),
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="text-cyan underline underline-offset-2"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {message.content}
                          </Markdown>
                          {streaming && message === messages[messages.length - 1] && (
                            <span className="caret" aria-hidden />
                          )}
                        </div>
                      ) : (
                        <span className="flex items-center gap-2 text-muted">
                          <span className="flex gap-1">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-cyan" />
                            <span className="h-1 w-1 animate-pulse rounded-full bg-cyan [animation-delay:150ms]" />
                            <span className="h-1 w-1 animate-pulse rounded-full bg-cyan [animation-delay:300ms]" />
                          </span>
                          retrieving records
                        </span>
                      )
                    ) : (
                      message.content
                    )}
                  </div>

                  {message.role === "assistant" && message.content && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void copy(message)}
                        className="inline-flex items-center gap-1 text-[0.5625rem] uppercase tracking-[0.14em] text-muted/60 transition-colors hover:text-silver"
                      >
                        {copiedId === message.id ? <Check size={10} /> : <Copy size={10} />}
                        {copiedId === message.id ? "copied" : "copy"}
                      </button>
                      {synthesisSupported && (
                        <button
                          type="button"
                          onClick={() => (speaking ? stopSpeaking() : speak(message.content))}
                          className="inline-flex items-center gap-1 text-[0.5625rem] uppercase tracking-[0.14em] text-muted/60 transition-colors hover:text-silver"
                        >
                          <Volume2 size={10} />
                          {speaking ? "stop" : "listen"}
                        </button>
                      )}
                      {message.stopped && <span className="label !text-[0.5rem]">stopped</span>}
                    </div>
                  )}

                  {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.sources.map((source) => (
                        <button
                          key={source.href + source.title}
                          type="button"
                          onClick={() => openSource(source.href)}
                          className="inline-flex max-w-full items-center gap-1 border border-line/70 px-2 py-1 text-left text-[0.5625rem] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/40 hover:text-cyan"
                        >
                          <span className="truncate">{source.title}</span>
                          <ArrowUpRight size={9} className="shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {message.role === "assistant" && message.error && (
                    <p className="mt-2 border-l border-violet/60 pl-2 text-[0.6875rem] leading-relaxed text-muted">
                      {message.error} The answer above was served from verified local records.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-line px-3 pb-3 pt-3 sm:px-4">
            {voiceError && (
              <p className="mb-2 px-1 text-[0.6875rem] leading-relaxed text-violet/90">{voiceError}</p>
            )}
            {listening && (
              <p className="mb-2 flex items-center gap-2 px-1 text-[0.6875rem] text-cyan">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
                Listening — speak now. Nothing is recorded or stored.
              </p>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
              className="flex items-end gap-2 border border-line bg-void/60 px-2.5 py-2 focus-within:border-cyan/40"
            >
              <label htmlFor="assistant-input" className="sr-only">
                Ask SOMANADH.AI a question
              </label>
              <textarea
                id="assistant-input"
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 900))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
                placeholder={listening ? "Listening…" : "Ask about experience, stack, projects…"}
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[0.8125rem] leading-relaxed text-silver outline-none placeholder:text-muted/50"
                maxLength={900}
                disabled={streaming}
              />
              <button
                type="button"
                onClick={toggleListening}
                aria-pressed={listening}
                aria-label={listening ? "Stop listening" : "Ask by voice"}
                title={
                  speechSupported
                    ? "Ask by voice (Chrome/Edge recommended)"
                    : "Voice input is not supported in this browser"
                }
                className={cn(
                  "flex h-9 w-8 shrink-0 items-center justify-center text-muted transition-colors hover:text-cyan",
                  listening && "text-cyan",
                  !speechSupported && "opacity-40",
                )}
              >
                {listening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
              {streaming ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  aria-label="Stop generating"
                  className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-silver transition-colors hover:border-violet hover:text-violet"
                >
                  <Square size={12} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send question"
                  className="flex h-9 w-9 shrink-0 items-center justify-center border border-cyan bg-cyan text-void transition-opacity disabled:opacity-30"
                >
                  <Send size={14} />
                </button>
              )}
              {speaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  aria-label="Stop speaking"
                  className="flex h-9 w-8 shrink-0 items-center justify-center text-cyan"
                >
                  <Square size={11} />
                </button>
              )}
            </form>
            <div className="mt-2 flex items-center justify-between gap-3 px-1">
              <p className="text-[0.5625rem] leading-relaxed text-muted/50">
                {mode === "openrouter" || mode === "unknown"
                  ? assistant.disclaimer
                  : mode === "fallback-degraded"
                    ? "Live model unavailable — answers are coming from verified local records."
                    : assistant.fallbackNotice}
              </p>
              <span className="mono shrink-0 text-[0.5rem] uppercase tracking-[0.14em] text-muted/40">
                {input.length}/900
              </span>
            </div>
            {!speechSupported && (
              <p className="mt-1 px-1 text-[0.5625rem] text-muted/40">
                Voice input requires browser speech recognition (Chrome/Edge). Text input always works.
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
