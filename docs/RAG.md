# RAG setup and maintenance

This document covers the retrieval-augmented generation (RAG) layer used by the portfolio assistant. It is an addition to the existing FastAPI/Next.js application, not a separate service.

## What it does

```text
Visitor question
  → Next.js chat UI
  → FastAPI /api/ai/chat
  → input validation + injection/unsupported-question guard
  → Sentence Transformer embedding (all-MiniLM-L6-v2)
  → Chroma cosine search over public Markdown chunks
  → lexical/category rerank + similarity threshold
  → grounded context in the system prompt
  → OpenRouter stream (when configured)
  → grounded fallback (when not configured or the provider fails)
  → SSE deltas + source references in the existing UI
```

The Markdown knowledge base is the primary factual source. The existing lexical retrieval over portfolio records remains a fallback for site-specific questions when the vector index is unavailable or returns no usable context.

No LangChain or agent framework is used. The pipeline is a small, explicit Python module.

## Knowledge base

Primary file:

```text
api/knowledge/Somanadh_Portfolio_RAG_Knowledge_Base.md
```

Rules:

- Edit this file to update professional facts.
- Do not add unverified employers, dates, metrics, publications, awards, certifications, links, or project outcomes.
- Keep project status explicit. Concepts, prototypes, and deployed systems are different states.
- The document's own sections marked as working notes are classified `visibility=internal` and are excluded from visitor retrieval:
  - “Details to verify and add next”
  - “RAG retrieval and answer rules”
  - “Source note”
- The document preamble is also internal.

The ingestion code also assigns a category and a site anchor to each chunk (for example `experience` → `/#experience`, `projects` → `/#work`, `contact` → `/#contact`).

## Dependencies

Added to `api/pyproject.toml` and `api/uv.lock`:

- `sentence-transformers` (locked at 6.2.0)
- `chromadb` (locked at 1.5.9)

The embedding model `all-MiniLM-L6-v2` is downloaded from Hugging Face on first use (about 90 MB) and cached by the host. It is not committed to the repository.

Python 3.14 is supported by the installed `torch` wheel in this environment. If a future host lacks a compatible wheel, use a supported Python version or the `hash` embedding backend for a constrained/offline deployment.

## Environment variables

Defaults are resolved from the API directory, so they work when uvicorn is started inside `api/`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `RAG_ENABLED` | `true` | Disable retrieval entirely if needed |
| `KNOWLEDGE_PATH` | `api/knowledge/Somanadh_Portfolio_RAG_Knowledge_Base.md` | Markdown source |
| `CHROMA_DIR` | `api/data/chroma` | Persistent Chroma directory (gitignored) |
| `RAG_COLLECTION` | `somanadh_knowledge` | Chroma collection name |
| `RAG_EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence Transformer model |
| `RAG_EMBEDDING_BACKEND` | `sentence-transformers` | `sentence-transformers` or `hash` |
| `RAG_TOP_K` | `5` | Maximum chunks sent to the model |
| `RAG_SIMILARITY_THRESHOLD` | `0.30` | Minimum final relevance score |
| `RAG_CHUNK_TOKENS` | `550` | Target chunk size (word-estimated) |
| `RAG_CHUNK_OVERLAP` | `80` | Target overlap for long-section splits |
| `RAG_MAX_CONTEXT_CHARS` | `7000` | Context budget |
| `RAG_AUTO_REINDEX` | `true` | Rebuild when the document hash changes |

`RAG_EMBEDDING_BACKEND=hash` is a deterministic hashed bag-of-words fallback. It is useful for tests or a host that cannot run Sentence Transformers, but it is **not** semantically equivalent and should not be the default in production.

## Ingestion and chunking

Implemented in `api/app/rag.py`:

1. Read the Markdown file and compute its SHA-256.
2. Split by Markdown headings while preserving the heading hierarchy.
3. Clean presentation Markdown (links become `label (url)`, emphasis is removed).
4. Merge consecutive small sibling sections under the same parent/category/visibility toward the configured token budget.
5. Split long sections by words with overlap, preferring sentence boundaries.
6. Attach metadata: source, section, heading, heading path, category, visibility, chunk index, token estimate, and site href.
7. Generate normalized embeddings in batches.
8. Rebuild the Chroma collection with cosine distance.
9. Write a manifest containing the document hash, timestamp, model, backend, chunk counts, and collection name.

The manifest is `api/data/chroma/manifest.json`. It is not a second database; it is change-detection state.

Local verification produced **22 chunks: 18 public and 4 internal**. Chunk sizes ranged from small heading-specific sections to roughly 553 estimated tokens. Small sections are intentionally retained when merging would mix unrelated facts; long sections are split.

## Retrieval

For each question:

1. Reject prompt-injection attempts and unsupported sensitive questions (for example salary) before retrieval.
2. Embed the query.
3. Ask Chroma for public candidates using cosine distance.
4. Rerank with query aliases, category hints, and lexical overlap.
5. Drop results below `RAG_SIMILARITY_THRESHOLD`.
6. Build a context block with heading paths, categories, and relevance scores.
7. Return the top `RAG_TOP_K` chunks and source references.

Retrieved text is treated as untrusted data. The system prompt explicitly forbids following instructions embedded in it.

The assistant returns the existing SSE contract (`meta`, `delta`, `done`, `end`, optional `error`). Metadata now includes:

```json
{
  "retrieval": "semantic",
  "knowledgeChunks": 5,
  "sources": [{ "title": "...", "href": "/#about", "snippet": "..." }]
}
```

`retrieval` is `semantic`, `lexical`, or `none`. When the model is unavailable, the answer is clearly labelled as a local grounded fallback.

## Initial indexing

Start the API:

```bash
cd api
uv sync --dev
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The index is created lazily on the first retrieval request, or immediately from the admin studio. To force it from the command line after logging in:

```bash
curl -c /tmp/somanadh-admin.cookies \
  -H 'content-type: application/json' \
  -d '{"password":"YOUR_LOCAL_ADMIN_PASSWORD"}' \
  http://127.0.0.1:8000/api/admin/login

curl -b /tmp/somanadh-admin.cookies \
  -X POST http://127.0.0.1:8000/api/admin/knowledge/reindex
```

Status:

```bash
curl -b /tmp/somanadh-admin.cookies \
  http://127.0.0.1:8000/api/admin/knowledge
```

Do not put a real password or API key in shell history or committed files.

## Reindexing

Reindex when the Markdown file changes.

- **Automatic:** with `RAG_AUTO_REINDEX=true`, the next chat retrieval sees the new hash and rebuilds. Until then, the admin status reports `stale: true`.
- **Manual:** `/admin` → Knowledge → Reindex, or `POST /api/admin/knowledge/reindex`.

Reindexing deletes and recreates the collection, so duplicate embeddings are not accumulated. It does not touch `content_items`, messages, analytics, or uploads.

If the index is missing or Chroma is unavailable, the assistant falls back to lexical records rather than failing the chat request. The admin status shows the error.

## Updating professional information

1. Edit `api/knowledge/Somanadh_Portfolio_RAG_Knowledge_Base.md`.
2. Keep verified facts separate from concepts and unverified details.
3. Start/restart the API if it is not already running.
4. Open `/admin` → Knowledge and click **Reindex**.
5. Confirm the chunk count, public/internal split, hash, and `indexed: true`.
6. Ask the affected questions in the portfolio chat.
7. If the change also affects public portfolio content, update `/admin` → Content and run `npm run content:sync` from `web/` when changing the seed file.

Do not edit `api/data/chroma` directly. It is generated state and is gitignored.

## Running tests

```bash
cd api
uv run pytest
uv run pytest tests/test_rag.py
```

The RAG tests use the real embedding model and isolated temporary Chroma directories. They cover ingestion, metadata, privacy, embeddings, semantic retrieval, unsupported questions, project status, document updates, admin auth, and provider failure.

Frontend checks:

```bash
cd web
npm run lint
npm run typecheck
npm run build
```

## Deployment

- Mount a persistent volume at `CHROMA_DIR` (for example `/var/data/chroma`).
- Pre-populate the Hugging Face cache for `all-MiniLM-L6-v2`, or allow one outbound download.
- Keep `OPENROUTER_API_KEY` server-side only.
- Run one API instance unless you add shared vector storage and a shared model cache.
- Set `RAG_AUTO_REINDEX=true` for single-instance deployments.
- Confirm `GET /api/admin/knowledge` after deploy.

The index is safe to rebuild, but a cold rebuild requires the model and CPU time. In local testing, a cached model load took about 2.4 seconds and an uncached load about 41 seconds.

## Troubleshooting

### `indexed: false`, `stale: true`, or `chunks: 0`

- Check that `KNOWLEDGE_PATH` points to the Markdown file.
- Click **Reindex** and inspect the error.
- Check the API log for the internal exception.
- Confirm `CHROMA_DIR` is writable.

### `Vector index unavailable`

Chroma could not open its directory. Check permissions and that the volume is mounted. The chat still falls back to lexical records; it does not crash.

### First request is slow

The embedding model is loading. It is cached process-wide after the first request. A cold host may also be downloading the model.

### Retrieval returns nothing for a valid question

- Check `RAG_SIMILARITY_THRESHOLD`; raise it to be stricter, lower it to be more permissive.
- Confirm the relevant section is public, not one of the internal headings.
- Reindex after editing.
- Use the admin status to confirm the collection is not empty.

### The model answers without context

Check the stream metadata. `"retrieval": "none"` means no public chunk passed the threshold. The assistant should refuse or ask for a narrower question rather than inventing facts. If it does not, treat that as a prompt/model regression and add a test.

### A project status sounds too strong

The knowledge base marks many projects as concepts or unverified. The prompt requires caveats. Check the retrieved chunk and the source Markdown; if the source is ambiguous, make the status explicit in the Markdown and reindex.

### Free OpenRouter model is rate-limited or retired

The API logs the provider failure and streams a labelled grounded fallback. Change `OPENROUTER_MODEL` to a currently available model and restart. Do not silently pretend a fallback answer came from the model.

`openrouter/free` is accepted as a configuration value, but in local testing it returned a safety stub rather than a useful answer. The verified local default is `dots-studio/dots-3-note-preview:free`.

## Honest status

- RAG retrieval, admin reindexing, and live OpenRouter answers were verified locally on 2026-10-25.
- No public deployment or production Chroma volume has been tested.
- The free OpenRouter model can change; the fallback path is intentional.
