# Testing and verification

## What was actually run

Recorded on **2026-10-25** in the local workspace:

| Check | Command | Result |
| --- | --- | --- |
| API tests | `cd api && uv run pytest` | **24 passed** in ~8–9s |
| RAG tests | `cd api && uv run pytest tests/test_rag.py` | **12 passed** (real MiniLM embeddings, isolated Chroma) |
| ESLint | `cd web && npm run lint` | Passed |
| TypeScript | `cd web && npm run typecheck` | Passed |
| Production build | `cd web && npm run build` | Passed; 13 static/SSG pages generated |
| Browser smoke test | `cd web && npm run qa` | **10/10** route/viewport checks passed |
| Résumé generation | `node scripts/generate-resume.mjs` | 120 KB, one page |
| Visual spot-check | Playwright screenshots at 1440 and 390 px | Hero, skills, privacy, project, admin checked |
| Live OpenRouter chat | `POST /api/ai/chat` and the Next.js proxy | Grounded answer streamed; `mode: "openrouter"`; no fallback error |

The remaining warning is a Chroma/OpenTelemetry deprecation notice about `asyncio.iscoroutinefunction` on Python 3.14. It does not affect retrieval or the application. The project pins current FastAPI/Starlette; revisit when the upstream telemetry dependency updates.

## API tests

The suite is isolated from local development data:

- `api/tests/conftest.py` sets a temporary SQLite database, temporary upload directory, test admin password, and empty OpenRouter credentials **before** importing the app.
- Every test gets a fresh database, fresh upload directory, and cleared in-process rate-limit buckets.
- `TestClient` runs the real FastAPI lifespan, including table creation and content seeding.
- No test writes to `api/data/somanadh.db` or `api/uploads/`.

Run:

```bash
cd api
uv sync --dev
uv run pytest
```

### Coverage

`tests/test_health_and_content.py`

- Health is operational and reports real counts.
- Security headers are present.
- AI status honestly reports fallback mode.
- Content is seeded from `content/portfolio.json`.
- GitHub remains unpublished (`null`).
- The three project records are present; only `somanadh-os` is verified.
- Verified and sealed project routes return correct data; unknown slugs return 404.

`tests/test_analytics_and_contact.py`

- Consent-style event ingestion records a session and pageview.
- Coarse device/browser/country enrichment works.
- Raw IP (`203.0.113.77`) is **not** present anywhere in the analytics tables.
- Heartbeat engagement is stored.
- Live visitor count reflects the active window.
- Admin analytics aggregates page views, unique visitors, projects, and countries.
- Admin login sets an HttpOnly cookie.
- Contact form stores a valid message.
- Honeypot submissions return success but are not stored.
- Invalid contact payloads return 422.
- Admin message list and status updates work.

`tests/test_admin_and_ai.py`

- Admin routes reject unauthenticated access.
- Wrong password returns 401; correct password returns a session.
- `/api/admin/me` reports the authenticated email.
- Stale content revisions return 409.
- Missing required content sections return 422.
- Content export returns an attachment with the current document.
- Invalid résumé and image uploads are rejected by signature.
- Valid PNG portrait and PDF résumé uploads update content.
- Chat streams `meta`, `delta`, `done`, and `end` SSE events.
- Fallback mode is labelled in the stream.
- AI interactions are logged and appear in admin analytics.
- Prompt-injection attempts receive the refusal path.
- Audience intros fall back deterministically without OpenRouter.

`tests/test_rag.py`

- Markdown ingestion preserves heading paths, categories, source metadata, and privacy visibility.
- Internal working notes (verification details, RAG rules, source note) are excluded from public chunks.
- Chunk IDs are unique and chunk token estimates stay within the configured ceiling.
- The real `all-MiniLM-L6-v2` model produces 384-dimensional normalized embeddings.
- Semantic retrieval finds the expected category and evidence for study, QEMS, AgenticOps, leadership, research, StudentOS, and tech-stack questions.
- Salary and unrelated questions return no retrieved context; salary is handled by the deterministic guardrail.
- A private-note query cannot retrieve internal content.
- Document hash changes trigger reindexing and update the chunk count.
- Chat metadata reports `retrieval: "semantic"` and `knowledgeChunks` when RAG is used.
- Research answers do not claim a publication.
- QEMS answers keep the unverified deployment caveat.
- Admin knowledge status/reindex require authentication; reindexing returns the current counts.
- OpenRouter connection failure produces a labelled, recoverable grounded fallback.

### Adding tests

- Put new tests in `api/tests/`.
- Use the `client` fixture for an isolated app instance.
- Use `admin_client` when authentication is needed.
- If you need the temporary DB path, import `TEST_DB` from `tests.conftest`.
- Do not point tests at the local `.env` database.
- If a test needs a new environment setting, add it to `conftest.py` **before** importing `app`.

## Frontend checks

```bash
cd web
npm run lint
npm run typecheck
npm run build
```

The production build currently reports:

```text
○ /                        20s revalidate
○ /privacy                 20s revalidate
● /projects/studentos      SSG
● /projects/qems           SSG
● /projects/somanadh-os    SSG
ƒ /admin                   dynamic
ƒ /api/proxy/[...path]     dynamic
○ /sitemap.xml
○ /robots.txt
○ /manifest.webmanifest
○ /icon
○ /opengraph-image
```

`npm run build` runs `npm run content:sync` first, so the bundled fallback matches `content/portfolio.json`.

## Browser smoke test

`web/scripts/qa-smoke.mjs` uses `playwright-core` with a locally installed Chrome/Chromium. It checks:

- `/`
- `/privacy`
- `/projects/somanadh-os`
- `/projects/studentos`
- `/admin`

at **1440×1000** and **390×844**, with reduced motion enabled to skip the cinematic intro.

For each route/viewport it verifies:

- HTTP 200
- Expected page text
- No horizontal overflow (`scrollWidth <= viewport + 1`)
- No unexpected console errors or uncaught page errors

The `/admin` login screen intentionally probes `/api/admin/me`, which returns 401 when signed out. The script filters that expected 401; it does not hide other errors.

Run against a production build:

```bash
cd web
npm run build
npm run start -- -p 3100
# in another terminal
npm run qa
```

Override the base URL:

```bash
QA_BASE_URL=https://your-preview.example npm run qa
```

Override the browser:

```bash
CHROME_BIN="/path/to/chrome" npm run qa
```

## Manual checks performed

- Desktop and mobile hero: no horizontal overflow; rotating identity fits at 390 px.
- Skills constellation: hub nodes and skill dots no longer collide; right panel updates on hover/focus.
- Consent notice: sits above the assistant trigger on mobile and does not overlay dialogs.
- Privacy page: consent controls render and describe the real behaviour.
- Verified project page: sections render only when data exists.
- Sealed project page: explicitly withholds unverified details.
- Admin: login screen renders without public site chrome.
- Reduced motion: intro is skipped, reveal animations resolve to visible, marquee/scanline are neutralised.
- Résumé PDF: one page, generated from verified content.

## What is not tested

These are real gaps, not footnotes:

- **Live OpenRouter inference in production.** Local inference was verified on 2026-10-25, but no deployed provider monitoring, paid-model evaluation, or long-running reliability test exists.
- **Public deployment.** No hosting provider, TLS certificate, custom domain, CDN, or production proxy was used.
- **Production geo headers.** Country enrichment is tested with synthetic `x-vercel-ip-country`; real CDN behaviour is unverified.
- **Persistent media and Chroma storage.** Uploads and the vector index were tested against temporary directories, not mounted production volumes.
- **Multi-instance RAG.** Chroma and the model cache are host-local; no shared vector store or distributed cache was tested.
- **Cold model download.** The model was cached locally. A fresh-host first download was not exercised end-to-end in CI.
- **Multi-instance rate limiting.** The limiter is in-process and single-instance.
- **Portrait rendering.** The supplied JPEG was verified at 1440px and 390px, with reduced motion enabled, and rendered through `next/image` without console errors.
- **StudentOS / QEMS details.** No functionality, stack, outcomes, or links are published because they are not verified.
- **Email delivery.** Contact messages are stored in the database; no email provider is configured.
- **Production admin hardening beyond this code.** WAF, IP allow-listing, SSO, and secret rotation are deployment concerns not implemented here.

## Troubleshooting

### Tests fail because the database is locked

Run tests from `api/` and make sure no local server is using the test database path. The suite uses its own temp file; a lock usually means a stale test process is still running.

### Browser QA cannot find Chrome

Set `CHROME_BIN`:

```bash
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run qa
```

### QA reports horizontal overflow

Check the exact route and viewport in the output. Common causes are long unbroken strings, wide fixed-width cards, or a marquee that is not clipped. Do not hide overflow globally to make the check pass.

### Admin QA reports 401

The signed-out studio probes `/api/admin/me` and receives 401 by design. The script filters that specific case. If you extend the QA script to log in, use a test-only password and do not commit it.

### Build serves stale content

The API content is revalidated every 20 seconds. If you changed content and the build still shows old data:

```bash
rm -rf web/.next/cache
cd web && npm run build
```

Also remember that the database is authoritative after first boot; editing `content/portfolio.json` alone does not update a running database.

## Live AI check (local)

On 2026-10-25 the assistant was tested with a real OpenRouter key using `dots-studio/dots-3-note-preview:free`:

- `GET /api/ai/status` returned `configured: true`, `mode: "openrouter"`, and the model ID.
- `POST /api/ai/chat` streamed `meta`, `delta`, `done`, and no `error` event.
- The same request through `/api/proxy/ai/chat` on the Next.js origin produced the same result.
- A prompt-injection request was refused without revealing instructions.
- An off-topic question was declined and redirected.
- A "why hire" question used only verified records and stated that public deployment is pending.

This verifies the local code path, not production reliability. Free models can rate-limit or disappear; the API then recovers with a labelled `fallback-degraded` answer. Re-run this check after changing `OPENROUTER_MODEL` and before making any public claim about live AI.

## RAG check (local)

On 2026-10-25 the Markdown knowledge base was indexed into `api/data/chroma`:

- `POST /api/admin/knowledge/reindex` returned `indexed: true`, `chunks: 22`, `publicChunks: 18`, `internalChunks: 4`.
- `GET /api/admin/knowledge` reported `embeddingModel: "all-MiniLM-L6-v2"`, `embeddingBackend: "sentence-transformers"`, and the document hash.
- `POST /api/ai/chat` for “Where does he study?” returned `"retrieval": "semantic"`, `"knowledgeChunks": 5`, and an answer naming Vardhaman College of Engineering.
- “What is QEMS?” returned the concept and explicitly kept the unverified deployment caveat.
- “What is his current salary?” returned no retrieved chunks and the deterministic unsupported-question response.
- The Knowledge tab in `/admin` rendered the status, counts, model, and reindex control.

Re-run after editing the Markdown file. The first retrieval on a fresh host loads the embedding model (about 40 seconds cold, about 2.4 seconds warm in local testing).
