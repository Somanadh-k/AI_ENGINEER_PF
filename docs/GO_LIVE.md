# Go-live runbook (Vercel + Hugging Face Space + Neon)

Status: **prepared, not deployed.** Dockerfile is untested (Docker daemon was off).

| Piece | Host | Cost |
| --- | --- | --- |
| Web (`web/`) | Vercel Hobby | $0 (non-commercial use) |
| API (`Dockerfile`) | HF Docker Space, CPU Basic | verify: Docker Spaces may require a paid HF plan; sleeps after 48h idle; disk is ephemeral |
| DB | Neon Postgres Free | $0 (0.5 GB, compute sleeps after 5 min idle) |
| AI | OpenRouter | free model, not guaranteed |
| Domain | registrar | `somanadh.info` is ALREADY REGISTERED by someone else (NS + A record exist) |

## Steps
1. Neon: create project, copy the connection string, use `postgresql+psycopg://USER:PASS@HOST/DB?sslmode=require`. Apply `api/migrations/001_initial.sql` once.
2. HF: create a Docker Space, push this repo to it (Dockerfile must be at root of the Space repo: copy/symlink `Dockerfile` to `Dockerfile`, build context = repo root). Add Space **secrets**: `DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `SECRET_SALT`, `PROXY_TOKEN`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `FRONTEND_ORIGIN`, `ADMIN_EMAIL`, `OPENROUTER_REFERER`. Set Space `app_port: 7860` in README front-matter.
3. Vercel: import GitHub repo, Root Directory `web`. Env: `API_INTERNAL_URL=https://<user>-<space>.hf.space`, `API_PROXY_TOKEN=<same as PROXY_TOKEN>`, `NEXT_PUBLIC_SITE_URL=https://<project>.vercel.app`.
4. Every push to `main` redeploys Vercel. Rollback: Vercel → Deployments → previous → Promote.
5. Uploads (admin-uploaded images/résumé) are lost on Space restart; keep assets in `web/public` or add object storage.
6. Keep the Space awake: it sleeps after 48h idle; first request after sleep is slow (the site falls back to bundled content meanwhile).

## Update: API host is Google Cloud Run (HF Docker Spaces need PRO)
```bash
gcloud auth login && gcloud config set project <PROJECT_ID>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
# Dockerfile is at the repo root, so --source . works.
gcloud run deploy somanadh-api --source . --region us-central1 --allow-unauthenticated \
  --memory 2Gi --cpu 1 --max-instances 1 --min-instances 0 --timeout 300 \
  --set-secrets DATABASE_URL=...,PROXY_TOKEN=...   # or --set-env-vars (see secrets below)
```
Set a $1 budget alert in Cloud Billing. `--max-instances 1` keeps the in-process rate limiter correct.

## LIVE: AWS Lambda (us-east-1) + Neon + Vercel
- Web: https://somanadh.info (Vercel project `ai-engineer-pf`). API: Lambda `somanadh-api` (arm64 container, 1 GB, Function URL, response streaming). DB: Neon Postgres (pooled). AI: OpenRouter.
- Redeploy API after code changes:
  `docker buildx build --platform linux/arm64 --provenance=false -t 137738969013.dkr.ecr.us-east-1.amazonaws.com/somanadh-api:latest --push .` then
  `aws lambda update-function-code --function-name somanadh-api --image-uri <that image>`
- Web: `vercel deploy --prod` from `web/` (or connect Git in Vercel for auto-deploy).
- Lambda env vars hold secrets (visible to AWS account admins). Embeddings are `hash` (no torch). Rate limiting is per Lambda instance (account concurrency cap prevents reserving 1).
- Admin uploads write to /tmp and are lost; the Chroma index rebuilds on cold start.
- Rollback API: `update-function-code` with a previous image digest. Rollback web: Vercel Deployments → Promote.
