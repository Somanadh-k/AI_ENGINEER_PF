# Architecture

## System shape

```text
Browser
  │
  ├── public pages ─────────────── Next.js App Router (web/)
  │                                   │
  │                                   ├── server fetch /api/content (20s revalidate)
  │                                   └── first-party proxy /api/proxy/*
  │                                                │
  │                                                ▼
  │                                         FastAPI (api/)
  │                                                │
  │              ┌─────────────────┬───────────────┼───────────────┬──────────────┐
  │              ▼                 ▼               ▼               ▼              ▼
  │        SQLAlchemy        RAG retrieval     OpenRouter      local media    admin auth
  │     SQLite / Postgres   Chroma + MiniLM    (optional)      api/uploads    sessions
  │                              │
  │                              ▼
  │                    knowledge/*.md (source)
  │
  └── /admin ───────────────────── private studio route
```

The browser never receives the OpenRouter key or a direct API base URL. Every browser call goes to a Next.js route. Next.js forwards it server-side to FastAPI using `API_INTERNAL_URL`.

## Frontend

- **Next.js 16 App Router**, React 19, TypeScript.
- Public routes live under `web/src/app/(site)/`; the private studio lives under `web/src/app/(studio)/`. This keeps the public header, footer, assistant, command palette, terminal, cursor, and consent notice out of the admin UI.
- `web/src/app/(site)/page.tsx` composes the homepage sections.
- `web/src/app/(site)/projects/[slug]/page.tsx` renders a verified project or an explicitly sealed record. Unverified projects are `noindex`.
- `web/src/lib/content.ts` fetches content from the API with a 20-second revalidation window and falls back to the bundled `web/src/content/portfolio.json` if the API is unavailable.
- `web/src/app/api/proxy/[...path]/route.ts` is the only browser-facing API path. It forwards allowed methods, cookies, streaming bodies, and selected headers, and rejects path traversal.
- The public shell is server-rendered. Interactive pieces (assistant, palette, terminal, analytics, cursor, intro, WebGL scene) are client components.

### Visual system

- Obsidian `#08090D`, graphite `#11141C`, cyan `#00E5FF`, violet `#8957FF`, silver `#DCE5F2`, mint `#76FFD7`.
- Space Grotesk for display, Inter for body, JetBrains Mono for labels, Instrument Serif for italic accents.
- The neural backdrop is lazy-loaded and replaced by a static composition when reduced motion is requested.
- The intro is capped at roughly three seconds and skipped entirely for `prefers-reduced-motion: reduce` or a prior session visit.
- All global motion, marquee, scanline, and reveal effects are neutralised under reduced motion.

## API

FastAPI modules:

| Module | Responsibility |
| --- | --- |
| `app/main.py` | app setup, CORS, security headers, routers, lifespan, media mount |
| `app/config.py` | environment-driven settings |
| `app/db.py` | async engine, session factory, UTC helpers, `create_all` |
| `app/models.py` | SQLAlchemy models |
| `app/schemas.py` | request validation |
| `app/content.py` | seed, read, validate, save content |
| `app/ai.py` | OpenRouter streaming, prompt rules, fallback, logging |
| `app/rag.py` | Markdown ingestion, heading-aware chunks, embeddings, Chroma retrieval, status/reindex |
| `app/knowledge.py` | site-record lexical retrieval, intent detection, deterministic fallback answers |
| `app/analytics.py` | event ingestion, session enrichment, aggregated summaries |
| `app/auth.py` | password verification, admin sessions, cookie helpers |
| `app/ratelimit.py` | in-process sliding-window rate limiter |
| `app/routers/*` | HTTP endpoints |

### Content model

Content is stored in `content_items`:

```text
kind        varchar(48)   primary key part
key         varchar(120)  primary key part
position    integer
data        jsonb / json
updated_at  timestamptz
```

`kind` is a family such as `profile`, `project`, `experience`, `skill-category`, or `build-log`. `key` is the entity identifier. Lists preserve their `position` ordering.

The full document is exposed at `GET /api/content` with a SHA-256 revision derived from all non-meta fields. The admin editor loads the document, edits it, and sends the whole document back with `baseRevision`. If another save happened in between, the API returns `409` instead of silently overwriting.

This is intentionally a single-document editor, not a CMS with per-field concurrency. For one owner and a small portfolio, it is the smallest model that is still safe.

### Seeding

On first boot, the API reads `content/portfolio.json` and writes rows. If any content row already exists, seeding is skipped. This means:

- Editing the JSON after the first boot does **not** change the running database.
- Use `/admin` to update runtime content, or delete the local SQLite file to reseed.
- The web fallback JSON is a build-time copy and is refreshed by `npm run content:sync`.

### AI assistant and RAG

1. The browser POSTs to `/api/proxy/ai/chat`.
2. FastAPI validates the message list, applies the chat rate limit, and sanitises the latest user message.
3. Prompt-injection patterns and unsupported sensitive questions (for example salary) are handled before retrieval.
4. `app/rag.py` lazily loads the Sentence Transformer (`all-MiniLM-L6-v2`) and queries the persistent Chroma collection (`api/data/chroma`) for public chunks.
5. Chroma cosine candidates are reranked with query aliases, heading/category hints, and lexical overlap. A configurable threshold (`RAG_SIMILARITY_THRESHOLD`) prevents unrelated context from being forced into the prompt.
6. The Markdown knowledge base is the primary factual source. If it returns no usable context, the existing `KnowledgeBase` lexical records remain a fallback for site-specific questions.
7. If OpenRouter is configured, the retrieved chunks become a strict system prompt and the model streams through OpenRouter.
8. If it is not configured, or the provider fails, `answer_from_knowledge()` / `answer_from_records()` assemble a labelled deterministic answer.
9. Every interaction is logged with question, intent, mode, latency, token counts, and source titles.

The system prompt forbids inventing employers, dates, metrics, projects, certifications, or seniority. It also states that retrieved knowledge is untrusted data, not instructions. Unverified projects must be described as concepts with unconfirmed status. Internal sections of the knowledge base (verification notes, source notes, and the document's own RAG rules) are marked `visibility=internal` and excluded from visitor retrieval.

The knowledge base is ingested by headings first. Small sibling sections are merged toward the configured chunk budget; long sections are split with overlap. Each chunk carries source, section, heading path, category, visibility, chunk index, token estimate, and a site anchor. The manifest stores the document SHA-256, model, timestamp, and chunk counts so unchanged documents are not re-embedded on every request.

Admin endpoints:

- `GET /api/admin/knowledge` — status, chunk counts, model, hash, last indexed timestamp, safe error.
- `POST /api/admin/knowledge/reindex` — rebuild the Chroma collection. Admin session required; no public ingestion or upload route exists.

### Analytics

- Consent is stored in `localStorage`; analytics are off until granted.
- A random visitor ID lives in `localStorage`; a random session ID lives in `sessionStorage`.
- The frontend sends events only when consent is granted.
- The API enriches sessions with coarse device/browser/OS, referrer host, source category, and country from CDN headers.
- Raw IP addresses are never stored. The rate limiter hashes a request host with `SECRET_SALT` for an in-memory bucket only.
- Active visitors are distinct visitor IDs seen in the last `ACTIVE_WINDOW_SECONDS` (60 by default).
- The admin dashboard reads aggregated SQL and streams a pulse over Server-Sent Events every five seconds.

### Admin auth

- Login is rate-limited.
- `ADMIN_PASSWORD_HASH` (bcrypt) is preferred; `ADMIN_PASSWORD` exists for local development.
- A random token is generated with `secrets.token_urlsafe`, stored only as a SHA-256 hash, and sent as an HttpOnly, SameSite=Lax cookie.
- `COOKIE_SECURE` is forced on in production.
- Sessions expire after `ADMIN_SESSION_HOURS`.
- `/admin` is excluded from robots and sitemap output.

### Uploads

- `POST /api/admin/upload?kind=portrait|resume|project`.
- Size is capped by `MAX_UPLOAD_MB`.
- Images are content-sniffed for JPEG, PNG, WebP, or AVIF signatures.
- Résumés must start with `%PDF-`.
- Files are written under `UPLOAD_DIR` with random names and served at `/media/...`.
- Portrait and résumé uploads update the content document; project uploads return a URL for manual use.
- The Next.js `rewrites()` rule proxies `/media/*` to the API.

## Database

SQLite is the development default and the current supported portfolio runtime. PostgreSQL remains an optional deployment target for the existing application; the RAG work does not require or perform a migration. JSON columns use SQLAlchemy's JSON with a JSONB variant for PostgreSQL.

Local startup calls `Base.metadata.create_all()`. That creates missing tables but does not alter existing ones. If PostgreSQL is used, apply `api/migrations/001_initial.sql` (and future numbered migrations) explicitly. See `api/migrations/README.md`.

Vectors are deliberately **not** stored in SQLite. Chroma persists under `CHROMA_DIR` (default `api/data/chroma`) with a JSON manifest for document-hash detection. This keeps the application database unchanged and makes reindexing independent of content saves.

## Security boundaries

- Server-side secrets: `OPENROUTER_API_KEY`, `ADMIN_PASSWORD`, `ADMIN_PASSWORD_HASH`, `SECRET_SALT`.
- Browser-visible: no API keys, no direct FastAPI URL, no admin token in JavaScript.
- CORS is restricted to `FRONTEND_ORIGIN`.
- API responses set `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Resource-Policy`.
- Next.js sets a small CSP and related headers.
- Request bodies are validated with `extra="forbid"` on write schemas.
- Uploads are validated by signature, not just extension or MIME type.

## Deliberate trade-offs

- **Local embeddings + Chroma instead of pgvector.** The corpus is one Markdown file and the deployment is single-instance. A local model and embedded Chroma keep the vector index out of the application database and avoid a managed vector service. The trade-off is a per-host model cache and a local persistent directory.
- **SSE instead of WebSockets.** The assistant and admin pulse are one-way streams. SSE is simpler and works through the proxy.
- **In-process rate limiting.** Correct for a single instance; move buckets to Redis before scaling horizontally.
- **Local uploads.** Simple and transparent; production needs a persistent volume or object storage.
- **One full-document content save.** Easier to reason about than partial writes; revision conflicts protect against lost updates.
- **No email provider.** Contact messages are stored and surfaced in the studio. Adding email is an explicit integration, not a hidden assumption.

## Known gaps

- Live OpenRouter inference was verified locally with a free model; no paid-model evaluation or production provider monitoring exists.
- Public deployment, TLS, CDN geo headers, persistent media, and a shared Chroma volume have not been tested in a hosting environment.
- The embedding model cache is host-local. A fresh instance needs network access for the first download unless the cache is pre-populated.
- The portrait source is a 400×400 JPEG. It is rendered through `next/image`; a higher-resolution source would improve sharpness on very large or high-density displays.
- StudentOS and QEMS remain sealed until verified.
- No certifications or GitHub URL are published because they are not verified.
