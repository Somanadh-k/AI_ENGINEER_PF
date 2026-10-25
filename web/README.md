# web

Next.js frontend for **SOMANADH.OS**.

The repository root contains the full setup, architecture, deployment, admin, and testing documentation:

- [README](../README.md)
- [Architecture](../docs/ARCHITECTURE.md)
- [RAG setup](../docs/RAG.md)
- [Deployment](../docs/DEPLOYMENT.md)
- [Admin studio](../docs/ADMIN.md)
- [Testing](../docs/TESTING.md)

## Local commands

```bash
cp .env.example .env.local
npm install
npm run dev
```

Other commands:

```bash
npm run build
npm run start
npm run lint
npm run typecheck
npm run content:sync
npm run resume:generate
npm run qa
```

The frontend expects the FastAPI service at `API_INTERNAL_URL` (default `http://127.0.0.1:8000`). Browser API calls go through the first-party proxy at `/api/proxy/*`.

`npm run build` and `npm run dev` sync `../content/portfolio.json` into the bundled fallback before starting. If the repository root is unavailable (for example, a host that deploys only `web/`), the sync keeps the committed fallback.
