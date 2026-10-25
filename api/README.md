# api

FastAPI service for **SOMANADH.OS**: content, grounded AI, analytics, contact, admin sessions, uploads, and SSE.

Full documentation lives at the repository root:

- [README](../README.md)
- [Architecture](../docs/ARCHITECTURE.md)
- [Deployment](../docs/DEPLOYMENT.md)
- [Admin studio](../docs/ADMIN.md)
- [Testing](../docs/TESTING.md)
- [Migrations](migrations/README.md)

## Local commands

```bash
uv sync --dev
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
uv run pytest
```

Configuration is read from environment variables, then `../.env`, then `api/.env`. See `../.env.example`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | health, content/event counts, AI mode |
| GET | `/api/content` | full portfolio document |
| GET | `/api/content/projects/{slug}` | one project |
| POST | `/api/analytics/event` | consent-gated event |
| POST | `/api/analytics/heartbeat` | active-session heartbeat |
| GET | `/api/analytics/live` | active visitor count |
| POST | `/api/contact` | contact form |
| POST | `/api/ai/chat` | SSE assistant stream |
| POST | `/api/ai/intro` | audience introduction |
| GET | `/api/ai/status` | provider status |
| POST | `/api/admin/login` | admin login |
| POST | `/api/admin/logout` | admin logout |
| GET | `/api/admin/me` | current session |
| GET/PUT | `/api/admin/content` | read/save content |
| GET | `/api/admin/analytics` | aggregated analytics |
| GET | `/api/admin/messages` | contact inbox |
| PATCH | `/api/admin/messages/{id}` | update message status |
| POST | `/api/admin/upload` | portrait/résumé/project media |
| GET | `/api/admin/stream` | SSE live pulse |
| GET | `/api/admin/export` | content export |

`/docs` and `/openapi.json` are disabled when `ENVIRONMENT=production`.

The browser should not call this service directly in production. Use the Next.js proxy at `/api/proxy/*`.
