"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  Clipboard,
  Database,
  Download,
  FileText,
  Image as ImageIcon,
  Inbox,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquareText,
  RefreshCw,
  Save,
  ShieldCheck,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type AuthState = "checking" | "out" | "in" | "offline";
type Tab = "overview" | "messages" | "content" | "knowledge" | "media";
type RangeKey = "24h" | "7d" | "30d" | "90d" | "all";
type UploadKind = "portrait" | "resume" | "project";

interface Distribution {
  label: string;
  value: number;
}

interface TrafficPoint {
  date: string;
  views: number;
  visitors: number;
}

interface Question {
  question: string;
  count: number;
}

interface RecentEvent {
  type: string;
  path?: string | null;
  project?: string | null;
  country?: string | null;
  device?: string | null;
  createdAt?: string | null;
}

interface Analytics {
  range: RangeKey;
  generatedAt: string;
  totals: {
    pageViews: number;
    uniqueVisitors: number;
    activeVisitors: number;
    visitsToday: number;
    visitsThisWeek: number;
    visitsThisMonth: number;
    resumeDownloads: number;
    contactClicks: number;
    aiMessages: number;
    contactSubmissions: number;
    avgEngagementSeconds: number;
  };
  trafficSeries: TrafficPoint[];
  topPages: Distribution[];
  topProjects: Distribution[];
  sources: Distribution[];
  referrers: Distribution[];
  devices: Distribution[];
  browsers: Distribution[];
  countries: Distribution[];
  topQuestions: Question[];
  recentEvents: RecentEvent[];
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "archived";
  sourcePage?: string | null;
  createdAt: string;
}

interface LivePulse {
  active: number;
  windowSeconds: number;
  pageViews24h: number;
  aiMessages24h: number;
  at: string;
}

interface AdminMe {
  authenticated: boolean;
  email: string;
  expiresAt: string;
}

interface ContentDocument {
  meta?: { revision?: string; updatedAt?: string };
  [key: string]: unknown;
}

interface KnowledgeStatus {
  enabled: boolean;
  available: boolean;
  indexed: boolean;
  stale: boolean;
  source: string;
  chunks: number;
  publicChunks: number;
  internalChunks: number;
  lastIndexedAt?: string | null;
  documentHash?: string | null;
  embeddingModel: string;
  embeddingBackend: string;
  collection: string;
  topK: number;
  similarityThreshold: number;
  error?: string | null;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/proxy${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T & { detail?: string };
  if (!response.ok) {
    throw new ApiError(data.detail ?? `Request failed (${response.status})`, response.status);
  }
  return data;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

function relativeTime(value?: string | null): string {
  if (!value) return "—";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-line bg-graphite/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="label">{label}</p>
        <span className="text-cyan/70">{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl tracking-tight text-silver">{value}</p>
      {detail && <p className="mt-1 text-[0.625rem] leading-relaxed text-muted/60">{detail}</p>}
    </div>
  );
}

function TrafficChart({ data }: { data: TrafficPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center border border-line bg-void/40">
        <p className="max-w-xs px-6 text-center text-[0.75rem] leading-relaxed text-muted/60">
          No pageviews recorded in this range. The chart appears when consenting visitors load a
          page — it is never padded with fake history.
        </p>
      </div>
    );
  }

  const width = 720;
  const height = 190;
  const padX = 20;
  const padY = 20;
  const max = Math.max(...data.map((point) => point.views), 1);
  const step = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;
  const points = data.map((point, index) => ({
    x: padX + index * step,
    y: height - padY - (point.views / max) * (height - padY * 2),
  }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${points[points.length - 1].x},${height - padY} L${points[0].x},${height - padY} Z`;

  return (
    <div className="border border-line bg-void/40 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" role="img" aria-label="Pageviews over time">
        <defs>
          <linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <line
            key={fraction}
            x1={padX}
            x2={width - padX}
            y1={height - padY - fraction * (height - padY * 2)}
            y2={height - padY - fraction * (height - padY * 2)}
            stroke="rgba(220,229,242,0.06)"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill="url(#traffic-fill)" />
        <path d={line} fill="none" stroke="#00e5ff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => (
          <circle key={data[index].date} cx={point.x} cy={point.y} r="2" fill="#00e5ff" />
        ))}
        {data.map((point, index) =>
          index === 0 || index === data.length - 1 ? (
            <text
              key={`label-${point.date}`}
              x={points[index].x}
              y={height - 4}
              fill="rgba(220,229,242,0.35)"
              fontSize="8"
              textAnchor={index === 0 ? "start" : "end"}
              fontFamily="var(--font-jetbrains)"
            >
              {point.date}
            </text>
          ) : null,
        )}
      </svg>
      <div className="flex items-center justify-between px-1 pt-2 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted/50">
        <span>{formatNumber(data.reduce((total, point) => total + point.views, 0))} views</span>
        <span>{formatNumber(Math.max(...data.map((point) => point.visitors)))} peak visitors</span>
      </div>
    </div>
  );
}

function BarList({ items, empty }: { items: Distribution[]; empty: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  if (!items.length) {
    return <p className="py-4 text-[0.75rem] text-muted/50">{empty}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={`${item.label}-${item.value}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-mono text-[0.625rem] uppercase tracking-[0.06em] text-silver/70">
              {item.label}
            </span>
            <span className="font-mono text-[0.625rem] text-muted">{formatNumber(item.value)}</span>
          </div>
          <div className="mt-1 h-1 w-full bg-white/[0.04]">
            <div
              className="h-full bg-cyan/60"
              style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border border-line bg-graphite/20 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="label text-cyan">{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

function LoginScreen({
  onLogin,
  error,
  busy,
}: {
  onLogin: (password: string) => Promise<void>;
  error: string | null;
  busy: boolean;
}) {
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-svh items-center justify-center bg-void px-5">
      <div className="w-full max-w-sm border border-line bg-graphite/25 p-6 shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center border border-cyan/30 bg-cyan/[0.06]">
            <LockKeyhole size={15} className="text-cyan" />
          </span>
          <div>
            <p className="label text-cyan">Private studio</p>
            <p className="font-display text-lg tracking-tight text-silver">SOMANADH.OS</p>
          </div>
        </div>
        <p className="mt-5 text-[0.8125rem] leading-relaxed text-muted">
          Content, messages, analytics, media, and the knowledge index live behind one password. The
          session is an HttpOnly cookie; the API rate-limits repeated attempts.
        </p>
        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!password || busy) return;
            void onLogin(password);
          }}
        >
          <label className="block">
            <span className="label mb-1.5 block">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              className="h-11 w-full border border-line bg-void/60 px-3 text-sm text-silver outline-none transition-colors focus:border-cyan/50"
              placeholder="Admin password"
            />
          </label>
          {error && (
            <p role="alert" className="mt-3 border-l border-violet/60 pl-3 text-[0.75rem] leading-relaxed text-violet/90">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || !password} className="btn btn-primary mt-5 w-full disabled:opacity-50">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
            {busy ? "Verifying" : "Enter studio"}
          </button>
        </form>
        <p className="mt-5 font-mono text-[0.5rem] uppercase leading-relaxed tracking-[0.14em] text-muted/40">
          Set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH on the API. Never ship the development password.
        </p>
      </div>
    </div>
  );
}

export function AdminStudio() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [email, setEmail] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [range, setRange] = useState<RangeKey>("7d");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsState, setAnalyticsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [live, setLive] = useState<LivePulse | null>(null);
  const [liveState, setLiveState] = useState<"connecting" | "live" | "offline">("connecting");

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesState, setMessagesState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesRefresh, setMessagesRefresh] = useState(0);
  const [updatingMessage, setUpdatingMessage] = useState<number | null>(null);

  const [contentText, setContentText] = useState("");
  const [contentDirty, setContentDirty] = useState(false);
  const [contentRevision, setContentRevision] = useState<string | null>(null);
  const [contentState, setContentState] = useState<"idle" | "loading" | "ready" | "saving" | "error">("idle");
  const [contentError, setContentError] = useState<string | null>(null);
  const [contentNotice, setContentNotice] = useState<string | null>(null);

  const [knowledge, setKnowledge] = useState<KnowledgeStatus | null>(null);
  const [knowledgeState, setKnowledgeState] = useState<"idle" | "loading" | "ready" | "error" | "reindexing">("idle");
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [knowledgeNotice, setKnowledgeNotice] = useState<string | null>(null);

  const [uploadKind, setUploadKind] = useState<UploadKind>("portrait");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAnalytics = useCallback(async (nextRange: RangeKey) => {
    setAnalyticsState("loading");
    setAnalyticsError(null);
    try {
      const data = await api<Analytics>(`/admin/analytics?range=${nextRange}`);
      setAnalytics(data);
      setAnalyticsState("ready");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuth("out");
        return;
      }
      setAnalyticsState("error");
      setAnalyticsError(error instanceof Error ? error.message : "Analytics unavailable");
    }
  }, []);

  const loadKnowledge = useCallback(async () => {
    setKnowledgeState("loading");
    setKnowledgeError(null);
    try {
      const status = await api<KnowledgeStatus>("/admin/knowledge");
      setKnowledge(status);
      setKnowledgeState("ready");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuth("out");
        return;
      }
      setKnowledgeState("error");
      setKnowledgeError(error instanceof Error ? error.message : "Knowledge status unavailable");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await api<AdminMe>("/admin/me");
        if (!alive) return;
        setEmail(me.email);
        setAuth("in");
      } catch (error) {
        if (!alive) return;
        if (error instanceof ApiError && error.status === 401) {
          setAuth("out");
        } else {
          setAuth("offline");
          setAuthError(error instanceof Error ? error.message : "The studio API is unreachable.");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (auth !== "in") return;
    const timer = window.setTimeout(() => void loadAnalytics(range), 0);
    return () => window.clearTimeout(timer);
  }, [auth, loadAnalytics, range]);

  useEffect(() => {
    if (auth !== "in") return;
    const source = new EventSource("/api/proxy/admin/stream");
    source.addEventListener("pulse", (event) => {
      try {
        setLive(JSON.parse((event as MessageEvent).data) as LivePulse);
        setLiveState("live");
      } catch {
        setLiveState("offline");
      }
    });
    source.onerror = () => setLiveState("offline");
    return () => {
      source.close();
    };
  }, [auth]);

  useEffect(() => {
    if (auth !== "in" || tab !== "messages") return;
    let alive = true;
    (async () => {
      setMessagesState("loading");
      setMessagesError(null);
      try {
        const data = await api<{ messages: ContactMessage[] }>("/admin/messages");
        if (!alive) return;
        setMessages(data.messages);
        setMessagesState("ready");
      } catch (error) {
        if (!alive) return;
        if (error instanceof ApiError && error.status === 401) {
          setAuth("out");
          return;
        }
        setMessagesState("error");
        setMessagesError(error instanceof Error ? error.message : "Messages unavailable");
      }
    })();
    return () => {
      alive = false;
    };
  }, [auth, messagesRefresh, tab]);

  useEffect(() => {
    if (auth !== "in" || tab !== "content") return;
    let alive = true;
    (async () => {
      setContentState("loading");
      setContentError(null);
      try {
        const doc = await api<ContentDocument>("/admin/content");
        if (!alive) return;
        setContentText(JSON.stringify(doc, null, 2));
        setContentRevision(doc.meta?.revision ?? null);
        setContentState("ready");
      } catch (error) {
        if (!alive) return;
        if (error instanceof ApiError && error.status === 401) {
          setAuth("out");
          return;
        }
        setContentState("error");
        setContentError(error instanceof Error ? error.message : "Content unavailable");
      }
    })();
    return () => {
      alive = false;
    };
  }, [auth, tab]);

  useEffect(() => {
    if (auth !== "in" || tab !== "knowledge") return;
    const timer = window.setTimeout(() => void loadKnowledge(), 0);
    return () => window.clearTimeout(timer);
  }, [auth, loadKnowledge, tab]);

  const login = async (password: string) => {
    setLoginBusy(true);
    setAuthError(null);
    try {
      const result = await api<{ ok: boolean; email: string }>("/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setEmail(result.email);
      setAuth("in");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = async () => {
    try {
      await api("/admin/logout", { method: "POST" });
    } catch {
      /* clear the UI even if the session already expired */
    }
    setAuth("out");
    setEmail("");
    setAnalytics(null);
    setMessages([]);
    setContentText("");
    setContentState("idle");
    setKnowledge(null);
    setKnowledgeState("idle");
  };

  const updateMessageStatus = async (id: number, status: ContactMessage["status"]) => {
    setUpdatingMessage(id);
    try {
      await api(`/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setMessages((previous) =>
        previous.map((message) => (message.id === id ? { ...message, status } : message)),
      );
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : "Could not update message");
    } finally {
      setUpdatingMessage(null);
    }
  };

  const formatContent = () => {
    try {
      setContentText(JSON.stringify(JSON.parse(contentText), null, 2));
      setContentError(null);
      setContentNotice("Formatted locally. Nothing saved yet.");
    } catch (error) {
      setContentError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };

  const saveContent = async () => {
    let parsed: ContentDocument;
    try {
      parsed = JSON.parse(contentText) as ContentDocument;
    } catch (error) {
      setContentError(error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON");
      return;
    }

    setContentState("saving");
    setContentError(null);
    setContentNotice(null);
    try {
      const result = await api<{ ok: boolean; content: ContentDocument }>("/admin/content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: parsed, baseRevision: contentRevision }),
      });
      setContentText(JSON.stringify(result.content, null, 2));
      setContentRevision(result.content.meta?.revision ?? null);
      setContentDirty(false);
      setContentState("ready");
      setContentNotice("Published. The public site reads this revision on its next revalidation.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuth("out");
        return;
      }
      setContentState("error");
      setContentError(
        error instanceof ApiError && error.status === 409
          ? `${error.message} Reload the latest revision before saving again.`
          : error instanceof Error
            ? error.message
            : "Could not save content",
      );
    }
  };

  const reloadContent = async () => {
    setContentState("loading");
    setContentError(null);
    setContentNotice(null);
    try {
      const doc = await api<ContentDocument>("/admin/content");
      setContentText(JSON.stringify(doc, null, 2));
      setContentRevision(doc.meta?.revision ?? null);
      setContentDirty(false);
      setContentState("ready");
    } catch (error) {
      setContentState("error");
      setContentError(error instanceof Error ? error.message : "Content unavailable");
    }
  };

  const reindexKnowledge = async () => {
    setKnowledgeState("reindexing");
    setKnowledgeError(null);
    setKnowledgeNotice(null);
    try {
      const result = await api<{ ok: boolean; knowledge: KnowledgeStatus }>("/admin/knowledge/reindex", {
        method: "POST",
      });
      setKnowledge(result.knowledge);
      setKnowledgeState("ready");
      setKnowledgeNotice(
        `Indexed ${result.knowledge.chunks} chunks (${result.knowledge.publicChunks} public, ${result.knowledge.internalChunks} internal).`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuth("out");
        return;
      }
      setKnowledgeState("error");
      setKnowledgeError(error instanceof Error ? error.message : "Reindex failed");
    }
  };

  const upload = async () => {
    if (!uploadFile) return;
    setUploadState("uploading");
    setUploadError(null);
    setUploadUrl(null);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      const response = await fetch(`/api/proxy/admin/upload?kind=${uploadKind}`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = (await response.json().catch(() => ({}))) as {
        detail?: string;
        url?: string;
      };
      if (!response.ok || !data.url) {
        throw new Error(data.detail ?? "Upload failed");
      }
      setUploadUrl(data.url);
      setUploadState("done");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (uploadKind === "portrait" || uploadKind === "resume") {
        setContentState("idle");
        setContentDirty(false);
      }
    } catch (error) {
      setUploadState("error");
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    }
  };

  const copyUrl = async () => {
    if (!uploadUrl) return;
    try {
      await navigator.clipboard.writeText(uploadUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const unread = useMemo(() => messages.filter((message) => message.status === "new").length, [messages]);
  const totals = analytics?.totals;

  if (auth === "checking") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-void">
        <div className="flex items-center gap-3 text-muted">
          <Loader2 size={16} className="animate-spin text-cyan" />
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em]">
            Verifying studio session
          </span>
        </div>
      </div>
    );
  }

  if (auth === "out") {
    return <LoginScreen onLogin={login} error={authError} busy={loginBusy} />;
  }

  if (auth === "offline") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-void px-5">
        <div className="w-full max-w-md border border-line bg-graphite/25 p-6">
          <div className="flex items-center gap-2 text-violet">
            <AlertTriangle size={15} />
            <p className="label label-strong">Studio API unreachable</p>
          </div>
          <p className="mt-4 text-[0.8125rem] leading-relaxed text-muted">
            {authError ??
              "The FastAPI service is not responding. Start it locally or check the deployment."}
          </p>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-ghost mt-5">
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-void">
      <header className="sticky top-0 z-20 border-b border-line bg-void/90 backdrop-blur-xl">
        <div className="mx-auto flex w-[min(1400px,100%-2rem)] flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center border border-cyan/30 bg-cyan/[0.06]">
              <LockKeyhole size={13} className="text-cyan" />
            </span>
            <div>
              <p className="mono text-[0.6875rem] font-medium tracking-[0.18em] text-silver">
                SOMANADH.OS / STUDIO
              </p>
              <p className="mono mt-0.5 text-[0.5rem] uppercase tracking-[0.18em] text-muted/50">
                Private content & telemetry
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 border border-line px-2 py-1 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted sm:flex">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  liveState === "live" ? "live-dot bg-mint" : "bg-muted/50",
                )}
              />
              {liveState === "live" ? "Live" : liveState === "connecting" ? "Connecting" : "Offline"}
            </span>
            <span className="hidden font-mono text-[0.5625rem] text-muted/60 lg:block">{email}</span>
            <Link href="/" className="btn btn-ghost h-9 px-3 text-[0.5625rem]">
              View site
              <ArrowUpRight size={11} />
            </Link>
            <button type="button" onClick={() => void logout()} className="btn btn-ghost h-9 px-3 text-[0.5625rem]">
              <LogOut size={11} />
              Sign out
            </button>
          </div>
        </div>
        <div className="mx-auto flex w-[min(1400px,100%-2rem)] gap-1 overflow-x-auto pb-2">
          {(
            [
              { id: "overview", label: "Overview", icon: <BarChart3 size={12} /> },
              { id: "messages", label: "Messages", icon: <Inbox size={12} /> },
              { id: "content", label: "Content", icon: <Database size={12} /> },
              { id: "knowledge", label: "Knowledge", icon: <BookOpen size={12} /> },
              { id: "media", label: "Media", icon: <ImageIcon size={12} /> },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 border px-3 py-2 font-mono text-[0.5625rem] uppercase tracking-[0.14em] transition-colors",
                tab === item.id
                  ? "border-cyan/40 bg-cyan/[0.06] text-cyan"
                  : "border-transparent text-muted hover:border-line hover:text-silver",
              )}
            >
              {item.icon}
              {item.label}
              {item.id === "messages" && unread > 0 && (
                <span className="rounded-full bg-violet/20 px-1.5 py-0.5 text-[0.5rem] text-violet">{unread}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto w-[min(1400px,100%-2rem)] py-6">
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label text-cyan">Telemetry overview</p>
                <h1 className="mt-2 font-display text-3xl tracking-tight text-silver">Measured, not decorated.</h1>
                <p className="mt-2 max-w-2xl text-[0.8125rem] leading-relaxed text-muted">
                  Counts come from the analytics tables. Nothing is seeded or estimated. Empty charts
                  mean no consenting visitors in that window.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={range}
                  onChange={(event) => setRange(event.target.value as RangeKey)}
                  className="h-9 border border-line bg-void px-2 font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-silver outline-none"
                  aria-label="Analytics range"
                >
                  {(["24h", "7d", "30d", "90d", "all"] as const).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void loadAnalytics(range)}
                  className="btn btn-ghost h-9 px-3 text-[0.5625rem]"
                  disabled={analyticsState === "loading"}
                >
                  <RefreshCw size={11} className={analyticsState === "loading" ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            </div>

            {analyticsError && (
              <p role="alert" className="border border-violet/30 bg-violet/[0.04] p-3 text-[0.75rem] text-violet/90">
                {analyticsError}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Live now"
                value={formatNumber(live?.active ?? totals?.activeVisitors ?? 0)}
                detail={`${live?.windowSeconds ?? 60}s active window · SSE pulse`}
                icon={<Activity size={14} />}
              />
              <Stat
                label="Pageviews"
                value={formatNumber(totals?.pageViews ?? 0)}
                detail={`${formatNumber(totals?.uniqueVisitors ?? 0)} unique visitors in range`}
                icon={<EyeIcon />}
              />
              <Stat
                label="AI messages"
                value={formatNumber(totals?.aiMessages ?? 0)}
                detail={`${formatNumber(totals?.avgEngagementSeconds ?? 0)}s average engagement`}
                icon={<MessageSquareText size={14} />}
              />
              <Stat
                label="Contact submissions"
                value={formatNumber(totals?.contactSubmissions ?? 0)}
                detail={`${formatNumber(totals?.resumeDownloads ?? 0)} résumé downloads`}
                icon={<Mail size={14} />}
              />
            </div>

            <Panel
              title="Traffic / pageviews"
              action={
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted/50">
                  {analytics?.generatedAt ? `updated ${relativeTime(analytics.generatedAt)}` : "loading"}
                </span>
              }
            >
              <TrafficChart data={analytics?.trafficSeries ?? []} />
            </Panel>

            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Top pages">
                <BarList items={analytics?.topPages ?? []} empty="No pageviews in range." />
              </Panel>
              <Panel title="Traffic sources">
                <BarList items={analytics?.sources ?? []} empty="No sources recorded." />
              </Panel>
              <Panel title="Devices">
                <BarList items={analytics?.devices ?? []} empty="No device data recorded." />
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Top questions">
                {analytics?.topQuestions.length ? (
                  <ol className="space-y-2.5">
                    {analytics.topQuestions.map((question, index) => (
                      <li key={`${question.question}-${index}`} className="flex gap-3">
                        <span className="mono mt-0.5 text-[0.5625rem] text-cyan/60">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 text-[0.75rem] leading-relaxed text-silver/70">
                          {question.question}
                        </span>
                        <span className="mono text-[0.5625rem] text-muted">{question.count}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="py-4 text-[0.75rem] text-muted/50">No assistant questions in range.</p>
                )}
              </Panel>
              <Panel title="Recent events">
                {analytics?.recentEvents.length ? (
                  <ul className="space-y-2">
                    {analytics.recentEvents.map((event, index) => (
                      <li
                        key={`${event.type}-${event.createdAt}-${index}`}
                        className="flex items-center justify-between gap-3 border-b border-line/60 pb-2 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-silver/70">
                            {event.type} · {event.project ?? event.path ?? "/"}
                          </p>
                          <p className="mono mt-0.5 text-[0.5rem] text-muted/40">
                            {event.country ?? "—"} · {event.device ?? "—"}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-[0.5rem] text-muted/40">
                          {relativeTime(event.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-4 text-[0.75rem] text-muted/50">No events recorded yet.</p>
                )}
              </Panel>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Visits today" value={formatNumber(totals?.visitsToday ?? 0)} icon={<Users size={14} />} />
              <Stat label="This week" value={formatNumber(totals?.visitsThisWeek ?? 0)} icon={<Users size={14} />} />
              <Stat label="This month" value={formatNumber(totals?.visitsThisMonth ?? 0)} icon={<Users size={14} />} />
              <Stat
                label="Contact clicks"
                value={formatNumber(totals?.contactClicks ?? 0)}
                detail="Button intent, not submissions"
                icon={<Mail size={14} />}
              />
            </div>
          </div>
        )}

        {tab === "messages" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label text-cyan">Private inbox</p>
                <h1 className="mt-2 font-display text-3xl tracking-tight text-silver">Messages</h1>
                <p className="mt-2 text-[0.8125rem] text-muted">
                  Stored contact submissions. Nothing here is published.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMessagesRefresh((value) => value + 1)}
                className="btn btn-ghost h-9 px-3 text-[0.5625rem]"
              >
                <RefreshCw size={11} />
                Refresh
              </button>
            </div>
            {messagesError && (
              <p role="alert" className="border border-violet/30 bg-violet/[0.04] p-3 text-[0.75rem] text-violet/90">
                {messagesError}
              </p>
            )}
            {messagesState === "loading" && (
              <p className="flex items-center gap-2 text-[0.75rem] text-muted">
                <Loader2 size={13} className="animate-spin" /> Loading messages
              </p>
            )}
            {messagesState === "ready" && messages.length === 0 && (
              <div className="border border-line bg-graphite/20 p-8 text-center">
                <Inbox size={20} className="mx-auto text-muted/40" />
                <p className="mt-3 font-display text-lg text-silver">No messages yet</p>
                <p className="mt-1 text-[0.75rem] text-muted/60">
                  The contact form writes here after server validation.
                </p>
              </div>
            )}
            <div className="space-y-3">
              {messages.map((message) => (
                <article key={message.id} className="border border-line bg-graphite/20">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-base tracking-tight text-silver">{message.subject}</p>
                        <span
                          className={cn(
                            "border px-1.5 py-0.5 font-mono text-[0.45rem] uppercase tracking-[0.12em]",
                            message.status === "new"
                              ? "border-cyan/30 text-cyan"
                              : message.status === "read"
                                ? "border-line text-muted"
                                : "border-line text-muted/40",
                          )}
                        >
                          {message.status}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-muted/60">
                        {message.name} · {message.email} · {relativeTime(message.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject)}`} className="btn btn-ghost h-8 px-2 text-[0.5rem]">
                        Reply
                      </a>
                      <button
                        type="button"
                        onClick={() => void updateMessageStatus(message.id, message.status === "read" ? "archived" : "read")}
                        disabled={updatingMessage === message.id}
                        className="btn btn-ghost h-8 px-2 text-[0.5rem] disabled:opacity-50"
                      >
                        {updatingMessage === message.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : message.status === "read" ? (
                          <X size={10} />
                        ) : (
                          <Check size={10} />
                        )}
                        {message.status === "read" ? "Archive" : "Mark read"}
                      </button>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap px-4 py-4 text-[0.8125rem] leading-relaxed text-silver/70">
                    {message.message}
                  </p>
                  <p className="border-t border-line/60 px-4 py-2 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted/40">
                    #{message.id} · source {message.sourcePage ?? "/"}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === "content" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label text-cyan">Content studio</p>
                <h1 className="mt-2 font-display text-3xl tracking-tight text-silver">Source of truth</h1>
                <p className="mt-2 max-w-2xl text-[0.8125rem] leading-relaxed text-muted">
                  Edit the full portfolio document as JSON. The API validates required sections,
                  URLs, slugs, and size limits before replacing the stored revision.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      try {
                        const response = await fetch("/api/proxy/admin/export", {
                          credentials: "include",
                          cache: "no-store",
                        });
                        if (!response.ok) throw new Error("Export failed");
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const anchor = document.createElement("a");
                        anchor.href = url;
                        anchor.download = "portfolio-export.json";
                        anchor.click();
                        URL.revokeObjectURL(url);
                      } catch (error) {
                        setContentError(error instanceof Error ? error.message : "Export failed");
                      }
                    })();
                  }}
                  className="btn btn-ghost h-9 px-3 text-[0.5625rem]"
                >
                  <Download size={11} />
                  Export
                </button>
                <button type="button" onClick={formatContent} className="btn btn-ghost h-9 px-3 text-[0.5625rem]">
                  <FileText size={11} />
                  Format
                </button>
                <button type="button" onClick={() => void reloadContent()} className="btn btn-ghost h-9 px-3 text-[0.5625rem]">
                  <RefreshCw size={11} />
                  Reload
                </button>
                <button
                  type="button"
                  onClick={() => void saveContent()}
                  disabled={contentState === "saving" || contentState === "loading"}
                  className="btn btn-primary h-9 px-3 text-[0.5625rem] disabled:opacity-50"
                >
                  {contentState === "saving" ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  Publish
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-graphite/20 px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="mono text-[0.5rem] uppercase tracking-[0.12em] text-muted/50">
                  revision {contentRevision ?? "—"}
                </span>
                {contentDirty && (
                  <span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-violet">
                    unsaved changes
                  </span>
                )}
              </div>
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted/40">
                {contentText.length.toLocaleString()} chars
              </span>
            </div>

            {contentError && (
              <p role="alert" className="border border-violet/30 bg-violet/[0.04] p-3 text-[0.75rem] text-violet/90">
                {contentError}
              </p>
            )}
            {contentNotice && (
              <p role="status" className="border border-mint/30 bg-mint/[0.04] p-3 text-[0.75rem] text-mint/90">
                {contentNotice}
              </p>
            )}

            <textarea
              value={contentText}
              onChange={(event) => {
                setContentText(event.target.value);
                setContentDirty(true);
                setContentNotice(null);
              }}
              spellCheck={false}
              aria-label="Portfolio content JSON"
              className="min-h-[62vh] w-full resize-y border border-line bg-[#090b10] p-4 font-mono text-[0.6875rem] leading-relaxed text-silver/80 outline-none transition-colors focus:border-cyan/40"
            />
            <p className="font-mono text-[0.5rem] uppercase leading-relaxed tracking-[0.1em] text-muted/40">
              Publishing updates the API content store immediately. The public site revalidates within 20 seconds.
              Keep a backup via Export before large edits.
            </p>
          </div>
        )}

        {tab === "knowledge" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label text-cyan">Retrieval layer</p>
                <h1 className="mt-2 font-display text-3xl tracking-tight text-silver">Knowledge base</h1>
                <p className="mt-2 max-w-2xl text-[0.8125rem] leading-relaxed text-muted">
                  The assistant retrieves from the Markdown knowledge base through local embeddings and
                  a persistent Chroma index. Internal working notes are excluded from visitor retrieval.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadKnowledge()}
                  className="btn btn-ghost h-9 px-3 text-[0.5625rem]"
                  disabled={knowledgeState === "loading" || knowledgeState === "reindexing"}
                >
                  <RefreshCw
                    size={11}
                    className={knowledgeState === "loading" ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void reindexKnowledge()}
                  className="btn btn-primary h-9 px-3 text-[0.5625rem]"
                  disabled={knowledgeState === "reindexing" || knowledgeState === "loading"}
                >
                  {knowledgeState === "reindexing" ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Database size={11} />
                  )}
                  {knowledgeState === "reindexing" ? "Indexing" : "Reindex"}
                </button>
              </div>
            </div>

            {knowledgeError && (
              <p role="alert" className="border border-violet/30 bg-violet/[0.04] p-3 text-[0.75rem] text-violet/90">
                {knowledgeError}
              </p>
            )}
            {knowledgeNotice && (
              <p role="status" className="border border-mint/30 bg-mint/[0.04] p-3 text-[0.75rem] text-mint/90">
                {knowledgeNotice}
              </p>
            )}
            {knowledge?.error && (
              <p role="alert" className="border border-violet/30 bg-violet/[0.04] p-3 text-[0.75rem] text-violet/90">
                {knowledge.error}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Indexed chunks"
                value={formatNumber(knowledge?.chunks ?? 0)}
                detail={`${formatNumber(knowledge?.publicChunks ?? 0)} public · ${formatNumber(
                  knowledge?.internalChunks ?? 0,
                )} internal`}
                icon={<BookOpen size={14} />}
              />
              <Stat
                label="State"
                value={
                  !knowledge
                    ? "—"
                    : knowledge.error
                      ? "Error"
                      : !knowledge.available
                        ? "Missing"
                        : knowledge.stale
                          ? "Stale"
                          : knowledge.indexed
                            ? "Ready"
                            : "Not indexed"
                }
                detail={knowledge?.stale ? "Source changed since indexing" : "Document hash checked"}
                icon={<ShieldCheck size={14} />}
              />
              <Stat
                label="Last indexed"
                value={knowledge?.lastIndexedAt ? relativeTime(knowledge.lastIndexedAt) : "Never"}
                detail={knowledge?.documentHash ? `hash ${knowledge.documentHash}` : "No manifest yet"}
                icon={<RefreshCw size={14} />}
              />
              <Stat
                label="Embedding model"
                value={knowledge?.embeddingModel ?? "—"}
                detail={`${knowledge?.embeddingBackend ?? "—"} · top ${knowledge?.topK ?? 5} · threshold ${
                  knowledge?.similarityThreshold ?? 0.3
                }`}
                icon={<Database size={14} />}
              />
            </div>

            <Panel
              title="Index configuration"
              action={
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted/50">
                  {knowledge?.source ?? "knowledge file"}
                </span>
              }
            >
              <div className="grid gap-3 text-[0.75rem] leading-relaxed text-muted sm:grid-cols-2">
                <div className="border border-line/70 bg-void/30 p-3">
                  <p className="label !text-[0.5rem]">Collection</p>
                  <p className="mt-1 font-mono text-[0.6875rem] text-silver/80">
                    {knowledge?.collection ?? "—"}
                  </p>
                </div>
                <div className="border border-line/70 bg-void/30 p-3">
                  <p className="label !text-[0.5rem]">Source file</p>
                  <p className="mt-1 font-mono text-[0.6875rem] text-silver/80">
                    {knowledge?.source ?? "—"}
                  </p>
                </div>
                <div className="border border-line/70 bg-void/30 p-3">
                  <p className="label !text-[0.5rem]">Retrieval</p>
                  <p className="mt-1 font-mono text-[0.6875rem] text-silver/80">
                    semantic + lexical rerank · visibility=public
                  </p>
                </div>
                <div className="border border-line/70 bg-void/30 p-3">
                  <p className="label !text-[0.5rem]">Auto reindex</p>
                  <p className="mt-1 font-mono text-[0.6875rem] text-silver/80">
                    on document hash change
                  </p>
                </div>
              </div>
              <p className="mt-4 text-[0.6875rem] leading-relaxed text-muted/60">
                Reindexing rebuilds the collection from the Markdown file. The operation is admin-only,
                never exposed publicly, and does not modify portfolio content or analytics.
              </p>
            </Panel>
          </div>
        )}

        {tab === "media" && (
          <div className="space-y-5">
            <div>
              <p className="label text-cyan">Media</p>
              <h1 className="mt-2 font-display text-3xl tracking-tight text-silver">Uploads</h1>
              <p className="mt-2 max-w-2xl text-[0.8125rem] leading-relaxed text-muted">
                Portrait and résumé uploads update the content document automatically. Project images
                are stored and return a URL you can place in a project&apos;s screenshots array.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Panel title="New upload">
                <div className="space-y-4">
                  <label className="block">
                    <span className="label mb-1.5 block">Kind</span>
                    <select
                      value={uploadKind}
                      onChange={(event) => {
                        setUploadKind(event.target.value as UploadKind);
                        setUploadState("idle");
                        setUploadUrl(null);
                        setUploadError(null);
                      }}
                      className="h-10 w-full border border-line bg-void px-2 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-silver outline-none"
                    >
                      <option value="portrait">Portrait image</option>
                      <option value="resume">Résumé PDF</option>
                      <option value="project">Project image</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="label mb-1.5 block">File</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={uploadKind === "resume" ? "application/pdf" : "image/jpeg,image/png,image/webp,image/avif"}
                      onChange={(event) => {
                        setUploadFile(event.target.files?.[0] ?? null);
                        setUploadState("idle");
                        setUploadUrl(null);
                        setUploadError(null);
                      }}
                      className="block w-full border border-line bg-void/60 p-2 font-mono text-[0.625rem] text-muted file:mr-3 file:border-0 file:bg-cyan/10 file:px-2 file:py-1 file:font-mono file:text-[0.5625rem] file:uppercase file:tracking-[0.1em] file:text-cyan"
                    />
                  </label>
                  <p className="text-[0.6875rem] leading-relaxed text-muted/60">
                    Maximum 6 MB. Images are checked by extension and file signature; résumés must
                    begin with a PDF header. SVG uploads are intentionally rejected.
                  </p>
                  {uploadError && (
                    <p role="alert" className="border-l border-violet/60 pl-3 text-[0.75rem] text-violet/90">
                      {uploadError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void upload()}
                    disabled={!uploadFile || uploadState === "uploading"}
                    className="btn btn-primary h-10 w-full disabled:opacity-50"
                  >
                    {uploadState === "uploading" ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <UploadCloud size={13} />
                    )}
                    {uploadState === "uploading" ? "Uploading" : "Upload"}
                  </button>
                </div>
              </Panel>

              <Panel title="Result">
                {uploadUrl ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-mint">
                      <Check size={14} />
                      <p className="font-display text-lg tracking-tight">Stored</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 overflow-hidden text-ellipsis border border-line bg-void/60 px-2 py-2 font-mono text-[0.625rem] text-silver/70">
                        {uploadUrl}
                      </code>
                      <button type="button" onClick={() => void copyUrl()} className="btn btn-ghost h-9 px-2 text-[0.5rem]">
                        {copied ? <Check size={11} /> : <Clipboard size={11} />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    {uploadUrl.endsWith(".pdf") ? (
                      <a href={uploadUrl} target="_blank" rel="noreferrer" className="btn btn-ghost h-9 w-full text-[0.5625rem]">
                        Open PDF
                        <ArrowUpRight size={11} />
                      </a>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={uploadUrl} alt="Uploaded preview" className="max-h-64 w-full border border-line object-contain" />
                    )}
                    <p className="text-[0.6875rem] leading-relaxed text-muted/60">
                      {uploadKind === "portrait"
                        ? "The profile portrait has been updated. The public site will revalidate."
                        : uploadKind === "resume"
                          ? "The résumé path and last-updated date have been updated."
                          : "Add this URL to a project's screenshots array in the Content tab."}
                    </p>
                  </div>
                ) : (
                  <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                    <ImageIcon size={22} className="text-muted/30" />
                    <p className="mt-3 text-[0.75rem] text-muted/50">
                      No upload in this session.
                      <br />
                      The result appears here with a copyable URL.
                    </p>
                  </div>
                )}
              </Panel>
            </div>

            <div className="border border-line bg-graphite/20 p-4">
              <p className="label text-cyan">Security boundary</p>
              <p className="mt-2 text-[0.75rem] leading-relaxed text-muted">
                Uploads require an authenticated admin session, are size-limited, and are stored
                outside the Next.js bundle. Media is served read-only from the API. The production
                deployment should put the API behind the same private network boundary as the Next.js
                proxy.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}
