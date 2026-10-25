# SOMANADH.OS

A cinematic, production-oriented portfolio for **Somanadh K**, built as a real system rather than a static brochure: a Next.js frontend, a FastAPI service, a grounded AI assistant, consent-gated analytics, and a private content studio.

> **Current status:** built and verified locally. Public deployment has **not** been performed. OpenRouter live inference is configured and was **tested locally**; free-model availability can change, so the assistant falls back to its deterministic grounded answers when the provider fails. The public StudentOS and QEMS records remain sealed; the RAG knowledge base describes them only as concepts with unverified status.

## What is actually here

| Area | Status |
| --- | --- |
| Cinematic frontend, responsive layouts, reduced-motion support | Built and browser-tested locally |
| FastAPI content, analytics, contact, AI, admin APIs | Built; 24 API tests passing |
| RAG assistant with local embeddings + persistent Chroma | Implemented; 22 indexed chunks (18 public, 4 internal) |
| Grounded assistant without an LLM | Working deterministic KB-grounded fallback |
| OpenRouter streaming | Implemented; **live-tested locally** on 2026-10-25 with `dots-studio/dots-3-note-preview:free` |
| Protected `/admin` studio | Working locally: analytics, messages, content editor, knowledge reindex, uploads, export |
| Consent-gated analytics and live visitor count | Working locally with real test events |
| StudentOS / QEMS | Intentionally sealed; no invented functionality, stack, outcomes, or links |
| Real portrait | Supplied and integrated in the hero; original preserved at the repository root |
| GitHub / certifications | Intentionally absent until verified |
| Production deployment | Documented, not performed |

The site never presents Somanadh as senior or as anything other than an early-career **B.Tech Computer Science & Engineering student** and **Forward Deployed AI Engineer Intern**.

## Stack

- **Web:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Motion, React Three Fiber / Three.js, Radix Dialog, Recharts
- **API:** Python 3.14, FastAPI, SQLAlchemy 2 async, Pydantic Settings, SQLite (supported default), optional PostgreSQL
- **AI/RAG:** Sentence Transformers (`all-MiniLM-L6-v2`) embeddings, persistent ChromaDB, Markdown heading-aware chunks, OpenRouter streaming when configured, deterministic grounded answers otherwise
- **Auth:** password login, bcrypt hash support, random server-side session token hashed in the database, HttpOnly cookie
- **Analytics:** consent-gated anonymous visitor/session IDs, no raw IP storage, country only from CDN headers

## Repository layout

```text
.
├── content/portfolio.json       # single source of truth for seed + bundled fallback
├── api/
│   ├── app/                     # FastAPI application (including app/rag.py)
│   ├── knowledge/               # primary Markdown RAG knowledge base
│   ├── data/chroma/             # generated persistent vector index (ignored)
│   ├── migrations/              # PostgreSQL baseline migration
│   └── tests/                   # isolated pytest suite
├── web/
│   ├── src/app/(site)/          # public routes
│   ├── src/app/(studio)/admin/  # private studio route
│   ├── src/app/api/proxy/       # first-party API proxy
│   ├── src/components/          # UI, assistant, admin, system components
│   └── scripts/                 # content sync + browser QA
├── scripts/                     # résumé generation + résumé source
└── docs/                        # architecture, deployment, admin, testing
```

## Quick start

### Prerequisites

- Node.js 20+ and npm
- Python 3.14 and [uv](https://docs.astral.sh/uv/)
- Chrome or Chromium only if you want to regenerate the résumé PDF or run the browser QA script

### 1. Configure the API

```bash
cp .env.example .env
```

For local development, set at least:

```dotenv
ENVIRONMENT=development
FRONTEND_ORIGIN=http://localhost:3000
DATABASE_URL=sqlite+aiosqlite:///./data/somanadh.db
ADMIN_PASSWORD=choose-a-local-password
SECRET_SALT=choose-a-long-random-local-salt
COOKIE_SECURE=false
```

Leave `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` empty to use the grounded fallback. Set both to enable live inference. The local setup uses `dots-studio/dots-3-note-preview:free`; reasoning-style free models need `AI_MAX_OUTPUT_TOKENS=1600` or more, because they spend tokens before producing visible text.

The RAG layer is enabled by default. The first run downloads `all-MiniLM-L6-v2` from Hugging Face (about 90 MB) and builds `api/data/chroma`; subsequent starts use the cached model and persistent index. To keep the index current, either leave `RAG_AUTO_REINDEX=true` (default) or reindex from `/admin` → Knowledge after editing the Markdown file. See [RAG setup](docs/RAG.md).

### 2. Start the API

```bash
cd api
uv sync --dev
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The first retrieval request may take a few seconds while the embedding model loads. The index is created automatically from `api/knowledge/Somanadh_Portfolio_RAG_Knowledge_Base.md`; the studio's Knowledge tab shows status, chunk counts, model, and indexing errors.

Health: <http://127.0.0.1:8000/api/health>  
API docs (development only): <http://127.0.0.1:8000/docs>

### 3. Start the web app

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>. The Next.js server proxies browser API calls to `API_INTERNAL_URL` (default `http://127.0.0.1:8000`), so the FastAPI service does not need to be public.

If port 3000 is already in use, run `npm run dev -- -p 3200` and set `FRONTEND_ORIGIN=http://localhost:3200` in the API `.env`. The browser proxy still works either way; CORS only matters for direct API calls.

### 4. Open the studio

Go to <http://localhost:3000/admin> and sign in with `ADMIN_PASSWORD`, or the password that matches `ADMIN_PASSWORD_HASH`.

## Content workflow

`content/portfolio.json` is the seed source of truth and the bundled fallback. The running API copies it into `content_items` on the **first** boot. After that, the database is authoritative.

- To edit locally through the UI: use `/admin` → Content.
- To change the seed for a fresh database: edit `content/portfolio.json`, then run `npm run content:sync` inside `web/`.
- To reset a local database to the current seed: stop the API, delete `api/data/somanadh.db`, then start the API again. This is destructive.
- To move runtime content back into the repository: use `/admin` → Content → Export, then review and commit the JSON deliberately.
- `npm run build` and `npm run dev` automatically run `content:sync` first, so the bundled fallback stays aligned with the seed file.

Only add facts that can be verified. The `StudentOS` and `QEMS` records are deliberately marked `"verified": false`; do not fill them with plausible-sounding details.

## Commands

### API

```bash
cd api
uv run pytest                         # 24 tests, isolated temp DB + Chroma
uv run uvicorn app.main:app --reload  # development server
```

### Web

```bash
cd web
npm run dev            # sync content + Next dev server
npm run build          # sync content + production build
npm run start          # serve the production build
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run content:sync   # copy content/portfolio.json into the web fallback
npm run resume:generate
npm run qa             # Playwright smoke test; needs a running server
```

`npm run qa` defaults to `http://localhost:3100`. Override with `QA_BASE_URL` and, if needed, `CHROME_BIN`.

### Résumé

The PDF is generated from `scripts/resume.html`, which contains only verified facts:

```bash
node scripts/generate-resume.mjs
```

Output: `web/public/resume/Somanadh-K-Resume.pdf`. Chrome/Chromium is required. Set `CHROME_BIN` if it is not in a standard location.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [RAG setup and maintenance](docs/RAG.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Admin studio](docs/ADMIN.md)
- [Testing and verification](docs/TESTING.md)
- [PostgreSQL migration](api/migrations/README.md)

## Security and privacy summary

- The OpenRouter key is server-side only. The browser talks to first-party Next.js routes.
- API input is validated with Pydantic; uploads are size-limited and content-sniffed.
- Admin sessions are random tokens stored hashed in the database and sent in an HttpOnly, SameSite=Lax cookie; Secure is forced in production.
- Analytics require explicit consent. Raw IP addresses are never stored. Rate-limit fingerprints are salted hashes and are not persisted.
- The assistant treats visitor input **and retrieved knowledge chunks** as untrusted, refuses prompt-injection attempts, excludes internal working notes from retrieval, and will not invent unpublished facts.
- `/admin` is excluded from robots and sitemap output.
- Rate limiting is in-process and assumes one API instance. Use Redis if you scale horizontally.

## Known limitations

- **Live inference depends on a free model.** It was tested locally with `dots-studio/dots-3-note-preview:free`. `openrouter/free` is accepted as a configuration value, but locally it returned a safety stub rather than an answer, so it is not the verified default. Free models can be rate-limited or retired; when that happens the API recovers with labelled grounded answers. No production provider monitoring or paid-model evaluation has been done.
- **RAG is local and single-process.** Chroma persists under `api/data/chroma`, and the embedding model is cached on the host. Horizontal scaling would need shared vector storage and a shared model cache; neither is configured.
- **First model download needs network access.** A fresh host must be able to reach Hugging Face once, or the model must be pre-populated in the Hugging Face cache. The hash embedding backend exists only as a constrained/offline fallback.
- **No public deployment test.** Deployment configuration is documented, not proven in a hosting environment.
- **Uploads are local files.** Production must mount a persistent volume or replace the media layer with object storage.
- **Geo data depends on the host.** Country is recorded only when a CDN supplies `x-vercel-ip-country`, `cf-ipcountry`, or `x-country-code`.
- **Content is a single document.** The admin editor uses revision-based conflict detection, not per-field collaborative editing.
- **No email delivery.** Contact messages are stored in the database and shown in the studio inbox; no email provider is configured.
- **StudentOS / QEMS are sealed.** They are visible as honest placeholders, not as documented projects.

## Contact

- Email: [skollavajjala@gmail.com](mailto:skollavajjala@gmail.com)
- LinkedIn: [somanadh-k](https://www.linkedin.com/in/somanadh-k-5ba42a25a)
- Earlier portfolio: [somanadh-k.github.io/My_Portfolio](https://somanadh-k.github.io/My_Portfolio/)

This is a personal portfolio project. No license is granted for reuse of personal content or identity.
