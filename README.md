# SOMANADH.OS

A cinematic, production-oriented portfolio for **Somanadh K**, built as a real system rather than a static brochure: a Next.js frontend, a FastAPI service, a grounded AI assistant, consent-gated analytics, and a private content studio.

> **Current status:** built and verified locally. Public deployment has **not** been performed. OpenRouter live inference is **not** configured, so the assistant currently runs in its deterministic grounded fallback mode. StudentOS and QEMS remain sealed records because their details have not been verified for publication.

## What is actually here

| Area | Status |
| --- | --- |
| Cinematic frontend, responsive layouts, reduced-motion support | Built and browser-tested locally |
| FastAPI content, analytics, contact, AI, admin APIs | Built; 12 API tests passing |
| Grounded assistant without an LLM | Working deterministic fallback |
| OpenRouter streaming | Implemented; **not tested live** because no key/model is configured |
| Protected `/admin` studio | Working locally: analytics, messages, content editor, uploads, export |
| Consent-gated analytics and live visitor count | Working locally with real test events |
| StudentOS / QEMS | Intentionally sealed; no invented functionality, stack, outcomes, or links |
| Real portrait | Not supplied; an abstract placeholder is rendered until one is uploaded |
| GitHub / certifications | Intentionally absent until verified |
| Production deployment | Documented, not performed |

The site never presents Somanadh as senior or as anything other than an early-career **B.Tech Computer Science & Engineering student** and **Forward Deployed AI Engineer Intern**.

## Stack

- **Web:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Motion, React Three Fiber / Three.js, Radix Dialog, Recharts
- **API:** Python 3.14, FastAPI, SQLAlchemy 2 async, Pydantic Settings, SQLite for development, PostgreSQL for production
- **AI:** OpenRouter streaming when configured; deterministic lexical retrieval and grounded answers otherwise
- **Auth:** password login, bcrypt hash support, random server-side session token hashed in the database, HttpOnly cookie
- **Analytics:** consent-gated anonymous visitor/session IDs, no raw IP storage, country only from CDN headers

## Repository layout

```text
.
├── content/portfolio.json       # single source of truth for seed + bundled fallback
├── api/
│   ├── app/                     # FastAPI application
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

Leave `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` empty to use the grounded fallback. Set both to enable live inference.

### 2. Start the API

```bash
cd api
uv sync --dev
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

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
uv run pytest                         # 12 tests, isolated temp DB
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
- [Deployment](docs/DEPLOYMENT.md)
- [Admin studio](docs/ADMIN.md)
- [Testing and verification](docs/TESTING.md)
- [PostgreSQL migration](api/migrations/README.md)

## Security and privacy summary

- The OpenRouter key is server-side only. The browser talks to first-party Next.js routes.
- API input is validated with Pydantic; uploads are size-limited and content-sniffed.
- Admin sessions are random tokens stored hashed in the database and sent in an HttpOnly, SameSite=Lax cookie; Secure is forced in production.
- Analytics require explicit consent. Raw IP addresses are never stored. Rate-limit fingerprints are salted hashes and are not persisted.
- The assistant treats visitor input as untrusted, refuses prompt-injection attempts, and will not invent unpublished facts.
- `/admin` is excluded from robots and sitemap output.
- Rate limiting is in-process and assumes one API instance. Use Redis if you scale horizontally.

## Known limitations

- **No live OpenRouter test.** The code path is implemented, but without `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` only fallback mode has been exercised.
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
