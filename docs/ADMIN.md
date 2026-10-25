# Admin studio

The private studio lives at `/admin`. It has no public header, footer, assistant, command palette, or consent notice.

## Authentication

- Password login only. There is no public registration or password reset flow.
- `ADMIN_PASSWORD_HASH` (bcrypt) is preferred. `ADMIN_PASSWORD` exists for local development.
- A successful login creates a random session token. Only a SHA-256 hash of the token is stored in `admin_sessions`.
- The token is sent in an HttpOnly, SameSite=Lax cookie named by `ADMIN_COOKIE_NAME` (default `so_admin`). `Secure` is forced when `ENVIRONMENT=production`.
- Sessions expire after `ADMIN_SESSION_HOURS` (default 12).
- Login is rate-limited to 6 attempts per 15 minutes per salted request fingerprint.
- Logout deletes the database session and clears the cookie.

Generate a bcrypt hash:

```bash
cd api
uv run python -c "import bcrypt; print(bcrypt.hashpw(b'your-password', bcrypt.gensalt()).decode())"
```

If you lose the password, rotate `ADMIN_PASSWORD_HASH` (or `ADMIN_PASSWORD`) in the API environment and restart. Existing sessions remain valid until they expire; delete rows from `admin_sessions` to invalidate them immediately.

## Overview

The default tab shows measured analytics for the selected range: 24 hours, 7 days, 30 days, 90 days, or all time.

- **Totals:** page views, unique visitors, active visitors, visits today/this week/this month, résumé downloads, contact clicks, assistant messages, contact submissions, average engagement.
- **Traffic chart:** page views and unique visitors per day.
- **Top pages, projects, sources, referrers, devices, browsers, countries.**
- **Top questions:** grouped assistant questions.
- **Recent events:** the latest 12 events.
- **Live pulse:** Server-Sent Events update active visitors and 24-hour counts every five seconds.

Analytics only include events sent after a visitor grants consent. An empty chart usually means nobody has opted in yet, not that tracking is broken.

## Messages

The Messages tab lists contact submissions from newest to oldest.

- Statuses: `new`, `read`, `archived`.
- Changing status updates the row and sets/clears `read_at`.
- There is no email notification provider. The studio inbox is the delivery mechanism.
- Messages contain name, email, subject, message, source page, and creation time.
- The form is rate-limited and server-validated. The hidden `website` honeypot is silently filtered.

## Content

The Content tab edits the full portfolio document as JSON.

Workflow:

1. The studio loads `GET /api/admin/content` and keeps its `meta.revision`.
2. You edit the JSON.
3. Save sends `PUT /api/admin/content` with the full document and `baseRevision`.
4. If the current revision differs, the API returns `409` and the studio asks you to reload. This prevents one tab from silently overwriting another.
5. Successful saves are written to `content_items` and become visible to the public API immediately (subject to the web's 20-second content revalidation).

Validation on the server:

- Required sections: `profile`, `hero`, `skills`, `experience`, `projects`, `seo`.
- `profile.name` is required.
- Profile email must contain `@` and no spaces.
- Links must be relative or `http(s)` URLs.
- Each project needs a slug and name; slugs are limited to letters, numbers, `-`, and `_`.
- Project `github`, `live`, `video`, and screenshot URLs must be safe.
- Each experience entry needs an organisation and role.
- Each skill category needs an id and a skills list.
- Each build-log entry needs a title.
- String, list, key, and total-payload sizes are capped.
- Unknown shapes are rejected.

Content rules:

- Do not invent employers, dates, metrics, certifications, project functionality, or outcomes.
- Keep `StudentOS` and `QEMS` at `"verified": false` until their details are checked.
- A `null` link or field means “not published”, not “fill this with a guess”.
- The bundled fallback (`web/src/content/portfolio.json`) is not updated by the admin editor. Run `npm run content:sync` from the full repository when the seed file changes, or export content deliberately.

### Export

`GET /api/admin/export` downloads the current document as `portfolio-export.json`. Use it before risky edits and to move runtime content back into `content/portfolio.json` after review.

## Knowledge

The Knowledge tab shows the retrieval index used by the assistant.

- **Status:** `Ready`, `Stale`, `Not indexed`, `Missing`, or `Error`.
- **Chunks:** total indexed chunks plus public/internal counts. Internal chunks are never retrieved for visitors.
- **Last indexed / document hash:** detects whether the Markdown file changed since the last build.
- **Embedding model:** `all-MiniLM-L6-v2` with the active backend and retrieval settings.
- **Reindex:** rebuilds the Chroma collection from `api/knowledge/Somanadh_Portfolio_RAG_Knowledge_Base.md`. This is the only supported ingestion path; there is no public upload or ingestion endpoint.

Endpoints (admin session required):

- `GET /api/admin/knowledge`
- `POST /api/admin/knowledge/reindex`

If the Markdown file is missing, the tab reports `Missing` and the assistant falls back to the existing lexical portfolio records. If indexing fails, the tab shows a safe error and the API logs the internal exception. Reindexing does not modify portfolio content, messages, or analytics.

The vector data lives in `CHROMA_DIR` (default `api/data/chroma`) and is gitignored. A reindex can run while the API is serving traffic. A search that overlaps the rebuild may briefly fall back to lexical records; the chat request does not fail.

## Media

The Media tab supports:

- **Portrait:** JPEG, PNG, WebP, or AVIF, content-sniffed. Updates `profile.portrait.src` and `uploadedAt`.
- **Résumé:** PDF, must start with `%PDF-`. Updates `profile.resume.path`, `lastUpdated`, and marks `generated: false`.
- **Project image:** JPEG, PNG, WebP, or AVIF. Returns a `/media/projects/...` URL for manual use in project content.

Limits and safety:

- Maximum size: `MAX_UPLOAD_MB` (default 6 MB).
- Files are written with random names under `UPLOAD_DIR`.
- Only allowed extensions and matching file signatures are accepted.
- Uploads are public once referenced by the portfolio. Do not upload private documents.
- Previous résumé files under `/media/resume/` are removed after a successful replacement. Other media is not garbage-collected automatically.

In production, `UPLOAD_DIR` must be persistent. Without a volume, media disappears on redeploy.

## Security notes

- The studio is excluded from robots and sitemap output.
- The admin cookie is HttpOnly; JavaScript cannot read it.
- The API enforces auth on every admin route, not just the UI.
- Uploads are validated on the server; the UI preview is not the security boundary.
- The studio does not expose raw IP addresses, visitor identities, or API keys.
- Rate limiting is in-process. Scale to Redis before multiple API instances.

## Operational checklist

Before publishing a change:

- [ ] Re-read any new claim against a verifiable source.
- [ ] Keep unverified projects sealed.
- [ ] Confirm no secrets, private messages, or visitor data entered the content JSON.
- [ ] Save, then load the public page and check the revision.
- [ ] Export the document if the change matters.
- [ ] Confirm the assistant still answers from the updated records.
- [ ] If the Markdown knowledge base changed, reindex from the Knowledge tab and verify the chunk count/hash.
- [ ] Confirm the fallback JSON is synced if you changed the seed file.
- [ ] Check the studio on a narrow viewport.
