# Go-live runbook (Vercel + Hugging Face Space + Neon)

Status: **prepared, not deployed.** Dockerfile is untested (Docker daemon was off).

| Piece | Host | Cost |
| --- | --- | --- |
| Web (`web/`) | Vercel Hobby | $0 (non-commercial use) |
| API (`api/Dockerfile`) | HF Docker Space, CPU Basic | verify: Docker Spaces may require a paid HF plan; sleeps after 48h idle; disk is ephemeral |
| DB | Neon Postgres Free | $0 (0.5 GB, compute sleeps after 5 min idle) |
| AI | OpenRouter | free model, not guaranteed |
| Domain | registrar | `somanadh.info` is ALREADY REGISTERED by someone else (NS + A record exist) |

## Steps
1. Neon: create project, copy the connection string, use `postgresql+psycopg://USER:PASS@HOST/DB?sslmode=require`. Apply `api/migrations/001_initial.sql` once.
2. HF: create a Docker Space, push this repo to it (Dockerfile must be at root of the Space repo: copy/symlink `api/Dockerfile` to `Dockerfile`, build context = repo root). Add Space **secrets**: `DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `SECRET_SALT`, `PROXY_TOKEN`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `FRONTEND_ORIGIN`, `ADMIN_EMAIL`, `OPENROUTER_REFERER`. Set Space `app_port: 7860` in README front-matter.
3. Vercel: import GitHub repo, Root Directory `web`. Env: `API_INTERNAL_URL=https://<user>-<space>.hf.space`, `API_PROXY_TOKEN=<same as PROXY_TOKEN>`, `NEXT_PUBLIC_SITE_URL=https://<project>.vercel.app`.
4. Every push to `main` redeploys Vercel. Rollback: Vercel → Deployments → previous → Promote.
5. Uploads (admin-uploaded images/résumé) are lost on Space restart; keep assets in `web/public` or add object storage.
6. Keep the Space awake: it sleeps after 48h idle; first request after sleep is slow (the site falls back to bundled content meanwhile).
