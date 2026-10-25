"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { trackEvent } from "@/lib/telemetry";
import type { Profile } from "@/lib/types";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; id?: number; note?: string }
  | { kind: "error"; message: string };

export function ContactForm({ profile }: { profile: Profile }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", website: "" });

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((previous) => ({ ...previous, [key]: event.target.value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status.kind === "sending") return;
    if (form.name.trim().length < 2) return setStatus({ kind: "error", message: "Please add your name." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setStatus({ kind: "error", message: "Please add a valid email address." });
    if (form.subject.trim().length < 2)
      return setStatus({ kind: "error", message: "Please add a subject." });
    if (form.message.trim().length < 10)
      return setStatus({ kind: "error", message: "Please write at least 10 characters." });

    setStatus({ kind: "sending" });
    void trackEvent("contact_click", { meta: { surface: "form-submit" } });

    try {
      const response = await fetch("/api/proxy/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          website: form.website,
          sourcePage: window.location.pathname,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        detail?: string;
        stored?: boolean;
        id?: number;
        note?: string;
      };
      if (!response.ok) {
        throw new Error(data.detail ?? "The message could not be sent.");
      }
      if (!data.stored) {
        throw new Error("The message was not stored. Please email directly.");
      }
      setStatus({ kind: "success", id: data.id, note: data.note });
      setForm({ name: "", email: "", subject: "", message: "", website: "" });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "The contact service is unavailable. Please email directly.",
      });
    }
  };

  if (status.kind === "success") {
    return (
      <div className="border border-mint/30 bg-mint/[0.04] p-6" role="status">
        <div className="flex items-center gap-2 text-mint">
          <Check size={16} />
          <p className="font-display text-lg tracking-tight">Message received</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-silver/80">
          Your message is stored in Somanadh&apos;s private inbox
          {status.id ? ` under reference #${status.id}` : ""}. It will not be published or shared.
        </p>
        <p className="mt-3 text-[0.75rem] leading-relaxed text-muted">
          {status.note ??
            "This deployment stores messages in its database; email notifications are not configured."}{" "}
          For anything time-sensitive, email{" "}
          <a href={`mailto:${profile.email}`} className="text-cyan underline underline-offset-2">
            {profile.email}
          </a>{" "}
          directly.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: "idle" })}
          className="mt-5 inline-flex items-center gap-2 border border-line px-3 py-2 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-silver"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-line bg-graphite/20 p-5 sm:p-6" noValidate>
      <div className="mb-5 flex items-center justify-between">
        <p className="label text-cyan">Direct transmission</p>
        <p className="mono text-[0.5rem] uppercase tracking-[0.14em] text-muted/40">
          Server-validated · rate limited
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label mb-1.5 block">Name</span>
          <input
            value={form.name}
            onChange={update("name")}
            required
            maxLength={120}
            autoComplete="name"
            className="h-11 w-full border border-line bg-void/60 px-3 text-sm text-silver outline-none transition-colors placeholder:text-muted/30 focus:border-cyan/50"
            placeholder="Your name"
          />
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={update("email")}
            required
            maxLength={200}
            autoComplete="email"
            className="h-11 w-full border border-line bg-void/60 px-3 text-sm text-silver outline-none transition-colors placeholder:text-muted/30 focus:border-cyan/50"
            placeholder="you@company.com"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="label mb-1.5 block">Subject</span>
        <input
          value={form.subject}
          onChange={update("subject")}
          required
          maxLength={200}
          className="h-11 w-full border border-line bg-void/60 px-3 text-sm text-silver outline-none transition-colors placeholder:text-muted/30 focus:border-cyan/50"
          placeholder="What is this about?"
        />
      </label>

      <label className="mt-4 block">
        <span className="label mb-1.5 flex items-center justify-between">
          <span>Message</span>
          <span className="text-muted/40">{form.message.length}/5000</span>
        </span>
        <textarea
          value={form.message}
          onChange={update("message")}
          required
          maxLength={5000}
          rows={5}
          className="w-full resize-y border border-line bg-void/60 px-3 py-2.5 text-sm leading-relaxed text-silver outline-none transition-colors placeholder:text-muted/30 focus:border-cyan/50"
          placeholder="A role, a collaboration, a question about the work…"
        />
      </label>

      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
        <label>
          Website
          <input
            name="website"
            value={form.website}
            onChange={update("website")}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[16rem] text-[0.5625rem] leading-relaxed text-muted/50">
          Used only to reply. Stored privately; never sold or published. See the{" "}
          <a href="/privacy" className="text-muted underline underline-offset-2 hover:text-silver">
            privacy note
          </a>
          .
        </p>
        <button
          type="submit"
          disabled={status.kind === "sending"}
          className="btn btn-primary min-w-[10rem] disabled:opacity-60"
        >
          {status.kind === "sending" ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Transmitting
            </>
          ) : (
            <>
              Send message
              <Send size={13} />
            </>
          )}
        </button>
      </div>

      <div aria-live="polite" className="min-h-[1.25rem]">
        {status.kind === "error" && (
          <p role="alert" className="mt-3 border-l border-violet/60 pl-3 text-[0.75rem] leading-relaxed text-violet/90">
            {status.message} You can also email{" "}
            <a href={`mailto:${profile.email}`} className="underline underline-offset-2">
              {profile.email}
            </a>
            .
          </p>
        )}
        {status.kind === "sending" && (
          <p className="mt-3 text-[0.625rem] uppercase tracking-[0.14em] text-muted/50">
            Sending to the private inbox…
          </p>
        )}
      </div>
    </form>
  );
}
