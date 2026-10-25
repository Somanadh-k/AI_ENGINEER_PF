# Deployment

This document describes a production deployment that matches the code. **It has not been executed against a real hosting provider.** Treat it as a runbook to verify, not as evidence that deployment already works.

## Recommended topology

```text
Visitor
  │
  ▼
Next.js host (Vercel, Node server, container)
  │  server-side fetch + /api/proxy/*
  ▼
FastAPI host (Render, Fly.io, Railway, container)
  │
  ├── SQLite (current default) or PostgreSQL (optional)
  ├── persistent Chroma directory + Hugging Face model cache
  ├── persistent media volume
  └── OpenRouter (optional)
```

The browser only talks to the Next.js origin. FastAPI can be public for health checks and media, but it does not need to be the browser's API base.

## Environment variables

### API

| Variable | Required | Notes |
| --- | --- | --- |
| `ENVIRONMENT` | yes | `production` disables `/docs` and `/openapi.json`, and forces Secure cookies |
| `FRONTEND_ORIGIN` | yes | Exact public web origin, e.g. `https://somanadh.example` |
| `DATABASE_URL` | yes | `sqlite+aiosqlite:///./data/somanadh.db` is the current default; PostgreSQL is optional and not required for RAG |
| `CONTENT_PATH` | yes | Path to `content/portfolio.json` inside the API image |
| `ADMIN_EMAIL` | yes | Displayed in the studio |
| `ADMIN_PASSWORD_HASH` | preferred | bcrypt hash; leave `ADMIN_PASSWORD` empty |
| `ADMIN_PASSWORD` | dev only | Plain password fallback; avoid in production |
| `SECRET_SALT` | yes | Long random value; salts rate-limit fingerprints |
| `COOKIE_SECURE` | yes | `true` in production (also forced by `ENVIRONMENT=production`) |
| `OPENROUTER_API_KEY` | optional | Server-side only |
| `OPENROUTER_MODEL` | optional | Must be set with the key for live inference; `dots-studio/dots-3-note-preview:free` was verified locally |
| `AI_MAX_OUTPUT_TOKENS` | optional | Default 1600; reasoning models need headroom before visible text |
| `OPENROUTER_REFERER` | recommended | Public site URL |
| `OPENROUTER_TITLE` | recommended | Human-readable app title |
| `RAG_ENABLED` | optional | Default `true` |
| `KNOWLEDGE_PATH` | optional | Absolute path to `Somanadh_Portfolio_RAG_Knowledge_Base.md`; default is `api/knowledge/...` |
| `CHROMA_DIR` | recommended | Persistent vector directory, e.g. `/var/data/chroma` |
| `RAG_COLLECTION` | optional | Default `somanadh_knowledge` |
| `RAG_EMBEDDING_MODEL` | optional | Default `all-MiniLM-L6-v2` |
| `RAG_EMBEDDING_BACKEND` | optional | `sentence-transformers` (default) or `hash` for constrained/offline environments |
| `RAG_TOP_K` | optional | Default 5 |
| `RAG_SIMILARITY_THRESHOLD` | optional | Default 0.30; raise to be stricter |
| `RAG_CHUNK_TOKENS` | optional | Default 550 |
| `RAG_CHUNK_OVERLAP` | optional | Default 80 |
| `RAG_MAX_CONTEXT_CHARS` | optional | Default 7000 |
| `RAG_AUTO_REINDEX` | optional | Default `true`; rebuild when the Markdown hash changes |
| `UPLOAD_DIR` | yes | Persistent volume path, e.g. `/var/data/uploads` |
| `RESUME_DIR` | yes | Usually `${UPLOAD_DIR}/resume` |
| `ANALYTICS_RETENTION_DAYS` | optional | Default 400 |
| `ACTIVE_WINDOW_SECONDS` | optional | Default 60 |
| `MAX_UPLOAD_MB` | optional | Default 6 |
| `MAX_CONTENT_BYTES` | optional | Default 1.5 MB |
| `CONTACT_RATE_LIMIT` | optional | Default 5/hour |
| `CHAT_RATE_LIMIT` | optional | Default 20/minute |
| `EVENT_RATE_LIMIT` | optional | Default 240/minute |

Generate a password hash locally:

```bash
cd api
uv run python -c "import bcrypt; print(bcrypt.hashpw(b'your-password', bcrypt.gensalt()).decode())"
```

Generate a salt:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Web

| Variable | Required | Notes |
| --- | --- | --- |
| `API_INTERNAL_URL` | yes | Server-reachable FastAPI origin, no trailing `/api` |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical public web origin; baked in at build time |

Also update `seo.siteUrl` in `content/portfolio.json` to the same public origin. The sitemap prefers the content value and falls back to `NEXT_PUBLIC_SITE_URL`.

## 1. Provision application storage

SQLite is the supported default. Put the database on a persistent volume and use an absolute path:

```text
DATABASE_URL=sqlite+aiosqlite:////var/data/somanadh.db
```

The four slashes are intentional: `sqlite+aiosqlite:///` plus an absolute path. Local startup creates missing tables. Back up the SQLite file and `CHROMA_DIR` together if you need a consistent restore.

PostgreSQL remains an optional deployment target for the existing application; it is not required for RAG and this work does not migrate to it. If you choose PostgreSQL, apply the baseline migration once:

```bash
psql "postgresql://user:password@host:5432/somanadh" -f api/migrations/001_initial.sql
```

```text
DATABASE_URL=postgresql+psycopg://user:password@host:5432/somanadh
```

Do not apply the baseline twice. Future schema changes belong in numbered migrations under `api/migrations/`.

## 2. Deploy the API

Build from `api/`. A minimal start command:

```bash
uv run uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --proxy-headers \
  --forwarded-allow-ips="<proxy-ip-or-range>"
```

Notes:

- Only trust forwarded headers from your actual proxy/CDN. The app uses `x-forwarded-for` for a salted, in-memory rate-limit fingerprint and CDN headers for country.
- Mount a persistent volume at `UPLOAD_DIR`. Without it, uploaded portraits, project images, and résumés disappear on redeploy.
- Mount a persistent volume at `CHROMA_DIR`. Without it, the vector index is rebuilt after every redeploy; this is safe but adds startup latency.
- Pre-populate the Hugging Face cache (or allow one outbound download) for `all-MiniLM-L6-v2`. The model is loaded lazily on the first retrieval request.
- Keep the OpenRouter key in the API environment only. Never put it in a `NEXT_PUBLIC_*` variable.
- Health check: `GET /api/health`.
- If the API is behind a proxy, disable response buffering for SSE. The API already sends `X-Accel-Buffering: no`.
- The API startup calls `create_all()`. In production, apply migrations first; `create_all()` then becomes a no-op for existing tables.

## 3. Deploy the web app

Build from `web/`:

```bash
npm ci
npm run build
npm run start
```

Or use your host's Next.js integration with:

- Install command: `npm ci`
- Build command: `npm run build`
- Output: Next.js default (`.next`)

`npm run build` runs `content:sync` first. If the host deploys only the `web/` directory and `../content/portfolio.json` is unavailable, the script keeps the committed fallback instead of failing. In that case, run `npm run content:sync` in the full repository and commit `web/src/content/portfolio.json` whenever the seed changes.

Set `API_INTERNAL_URL` to a URL the Next.js server can reach. If the frontend and API are on different platforms, this is usually the API's public origin. The browser still only sees the Next.js proxy.

## 4. First-run checks

1. `GET https://api.example/api/health` returns `status: "operational"` and `database: "ok"`.
2. `GET https://www.example/api/content` returns the seeded profile and three project records.
3. The public homepage loads with API and without API (bundled fallback).
4. `/privacy` loads and consent controls work.
5. `/admin` shows the login screen, not public site chrome.
6. Admin login sets a Secure, HttpOnly cookie.
7. Analytics only records after “Allow anonymous”.
8. Contact form stores a message; it appears in the studio inbox.
9. Assistant streams a fallback answer and labels the mode.
10. If OpenRouter is configured, the assistant streams a live answer and the UI labels it as OpenRouter.
11. `/admin` → Knowledge shows the source file, 22 chunks, `indexed: true`, and a recent timestamp.
12. Ask “Where does he study?” and confirm the stream metadata says `"retrieval": "semantic"` and the answer names Vardhaman College of Engineering.
13. Confirm `/images/somanadh-profile.jpeg` loads through the web origin. Upload a replacement portrait or résumé only if needed; verify `/media/...` loads and survives a redeploy.
14. Check `/sitemap.xml` and `/robots.txt` use the production URL; `/admin` is disallowed.
15. Run `QA_BASE_URL=https://www.example npm run qa` from `web/` if Chrome is available.

## 5. OpenRouter

1. Create an OpenRouter key.
2. Set `OPENROUTER_API_KEY` and a valid `OPENROUTER_MODEL`.
3. Set `OPENROUTER_REFERER` to the public site URL.
4. Restart the API.
5. Confirm `GET /api/ai/status` reports `configured: true` and `mode: "openrouter"`.
6. Ask a question and confirm the stream includes `"mode": "openrouter"`.
7. Force a provider failure if possible and confirm the stream falls back with a recoverable error event.

Until this is done, do not claim live AI inference in any public copy.

## 6. Media, RAG, and persistence

Uploads and the Chroma index are written to the local filesystem. Production options:

- Mount a persistent volume at `UPLOAD_DIR` (simplest, works for one API instance).
- Mount a persistent volume at `CHROMA_DIR` (for example `/var/data/chroma`). If it is ephemeral, the API rebuilds the index from the Markdown file when needed.
- Pre-populate the Hugging Face cache for `all-MiniLM-L6-v2`, or allow one outbound download. A cold model load took about 40 seconds in local verification; a warm load took about 2.4 seconds.
- Replace the upload handler with object storage (S3/R2) and serve signed or public URLs. This is not implemented yet.

If the API runs more than one instance without shared storage, uploads and vector indexes will diverge. RAG is currently designed for a single API instance.

## 7. Rate limiting and scale

The limiter is an in-process sliding window. It is correct for one API instance. Before running multiple API instances:

- Move the buckets to Redis (or another shared store).
- Keep the salted fingerprint approach; do not store raw IPs.
- Re-test contact, chat, login, heartbeat, and analytics limits.

## 8. Rollback

- **Web:** redeploy the previous build. Content served from the API is independent of the web build unless the bundled fallback changed.
- **API:** redeploy the previous image. Apply database migrations forward only; write a compensating migration for rollback rather than editing applied files.
- **Content:** use `/admin` → Content → Export before risky edits. The editor keeps a revision and rejects stale saves, but it is not a full version-control system.
- **Uploads:** keep volume snapshots if the portrait/résumé history matters.

## 9. Honest status

The following are **not verified**:

- Real deployment on Vercel/Render/Fly/Railway or any other host.
- TLS, custom domain, CDN geo headers, and proxy streaming behaviour in production.
- OpenRouter live inference in a deployed environment. It was verified against the local API on 2026-10-25, but not from a production host.
- Persistent Chroma storage, a pre-populated Hugging Face cache, and multi-instance vector consistency. Local RAG retrieval and reindexing were verified; production storage was not.
- Free-model availability over time; a rate-limited or retired model triggers the labelled grounded fallback.
- Persistent volume behaviour across a real redeploy.
- Multi-instance rate limiting.
- Production email delivery (there is no email provider).

Do not mark the deployment complete until the checks above have actually passed.
