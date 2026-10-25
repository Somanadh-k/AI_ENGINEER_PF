"use client";

const CONSENT_KEY = "so.consent.v1";
const VISITOR_KEY = "so.visitor.v1";
const SESSION_KEY = "so.session.v1";
const CONSENT_EVENT = "so:consent";

export type ConsentState = "granted" | "denied" | "unset";
export type TelemetryEventType =
  | "pageview"
  | "project_view"
  | "resume_download"
  | "contact_click"
  | "ai_open"
  | "ai_message"
  | "outbound_click"
  | "command_used";

interface TrackOptions {
  projectSlug?: string;
  meta?: Record<string, string | number | boolean>;
  path?: string;
}

function safeGet(storage: "local" | "session", key: string): string | null {
  try {
    const store = storage === "local" ? window.localStorage : window.sessionStorage;
    return store.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: "local" | "session", key: string, value: string): void {
  try {
    const store = storage === "local" ? window.localStorage : window.sessionStorage;
    store.setItem(key, value);
  } catch {
    /* storage may be blocked; telemetry simply stays off */
  }
}

function safeRemove(storage: "local" | "session", key: string): void {
  try {
    const store = storage === "local" ? window.localStorage : window.sessionStorage;
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return "unset";
  const value = safeGet("local", CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : "unset";
}

export function setConsent(state: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  safeSet("local", CONSENT_KEY, state);
  if (state === "denied") {
    safeRemove("local", VISITOR_KEY);
    safeRemove("session", SESSION_KEY);
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function onConsentChange(listener: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CONSENT_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function getVisitorId(): string | null {
  if (getConsent() !== "granted") return null;
  let id = safeGet("local", VISITOR_KEY);
  if (!id) {
    id = randomId();
    safeSet("local", VISITOR_KEY, id);
  }
  return id;
}

export function getSessionId(): string | null {
  if (getConsent() !== "granted") return null;
  let id = safeGet("session", SESSION_KEY);
  if (!id) {
    id = randomId();
    safeSet("session", SESSION_KEY, id);
  }
  return id;
}

export async function trackEvent(
  type: TelemetryEventType,
  options: TrackOptions = {},
): Promise<void> {
  if (typeof window === "undefined") return;
  if (getConsent() !== "granted") return;
  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  if (!visitorId || !sessionId) return;

  const body = {
    visitorId,
    sessionId,
    type,
    path: options.path ?? window.location.pathname,
    projectSlug: options.projectSlug,
    referrer: document.referrer || undefined,
    meta: options.meta,
  };

  try {
    await fetch("/api/proxy/analytics/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    /* analytics must never break the experience */
  }
}

export async function sendHeartbeat(engagementDelta: number, path?: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (getConsent() !== "granted") return;
  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  if (!visitorId || !sessionId) return;
  try {
    await fetch("/api/proxy/analytics/heartbeat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        visitorId,
        sessionId,
        path: path ?? window.location.pathname,
        engagementDelta: Math.max(0, Math.min(30, Math.round(engagementDelta))),
      }),
      keepalive: true,
    });
  } catch {
    /* silent by design */
  }
}

export async function fetchLiveVisitors(): Promise<{ active: number; windowSeconds: number } | null> {
  try {
    const response = await fetch("/api/proxy/analytics/live", {
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { active: number; windowSeconds: number };
    return typeof data.active === "number" ? data : null;
  } catch {
    return null;
  }
}

export function downloadWithTracking(href: string, label: string): void {
  void trackEvent("resume_download", { meta: { label } });
}
