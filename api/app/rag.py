from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import math
import re
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from .config import settings

log = logging.getLogger("somanadh.rag")

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
IMAGE_RE = re.compile(r"!\[[^\]]*\]\([^)]+\)")
BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
ITALIC_RE = re.compile(r"(?<!\*)\*([^*]+)\*(?!\*)")
INLINE_CODE_RE = re.compile(r"`([^`]+)`")
BULLET_RE = re.compile(r"^\s*[-*]\s+", re.MULTILINE)
SENTENCE_END_RE = re.compile(r"[.!?](?:\s|$)")

# The document is written for portfolio use, but these sections are working
# notes or meta-instructions. They must never be retrieved for a visitor.
INTERNAL_HEADINGS = (
    "details to verify",
    "rag retrieval and answer rules",
    "source note",
)

CATEGORY_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("contact", ("contact", "profile links")),
    ("education", ("education",)),
    ("experience", ("professional experience", "leadership", "soopervision", "ieee")),
    ("skills", ("technical skills", "areas of interest", "learning topics", "certifications")),
    ("projects", ("projects", "product concepts", "studentos", "qems", "agenticops", "arthaos")),
    ("research", ("research", "academic development")),
    ("approach", ("work style", "problem-solving")),
    ("profile", ("identity", "biography", "tell me about")),
    ("positioning", ("portfolio themes", "positioning")),
    ("faq", ("frequently asked",)),
)

QUERY_ALIASES: dict[str, tuple[str, ...]] = {
    "study": ("education", "college", "university", "degree", "btech", "student", "vardhaman"),
    "studies": ("education", "college", "university", "degree", "btech", "student", "vardhaman"),
    "education": ("study", "college", "university", "degree", "btech", "student"),
    "leadership": ("ieee", "chair", "society", "branch", "lead"),
    "internship": ("experience", "soopervision", "intern", "role", "work"),
    "experience": ("internship", "soopervision", "intern", "role", "work"),
    "tech": ("skills", "technologies", "stack", "tools", "python", "fastapi"),
    "stack": ("skills", "technologies", "tools", "python", "fastapi", "sql"),
    "project": ("projects", "studentos", "qems", "agenticops", "arthaos"),
    "projects": ("project", "studentos", "qems", "agenticops", "arthaos"),
    "contact": ("email", "linkedin", "reach", "hire"),
    "research": ("publication", "paper", "conference", "academic"),
    "agents": ("agent", "agentic", "multi-agent", "orchestration"),
}

CATEGORY_HINTS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("education", ("study", "studies", "education", "college", "university", "degree", "btech", "student")),
    ("experience", ("experience", "internship", "intern", "work", "role", "leadership", "ieee", "chair", "soopervision", "forward", "engineer", "engineering")),
    ("skills", ("skill", "skills", "tech", "stack", "technologies", "tools", "python", "fastapi", "sql")),
    ("projects", ("project", "projects", "qems", "studentos", "agenticops", "arthaos", "built")),
    ("research", ("research", "publication", "paper", "conference")),
    ("contact", ("contact", "email", "linkedin", "reach", "hire")),
    ("profile", ("who", "about", "background", "introduce", "summary")),
)

# These questions have no supported answer in the knowledge base. Refusing to
# retrieve avoids quoting an unrelated chunk that happens to be nearby.
UNSUPPORTED_QUERY_RE = re.compile(
    r"\b(salary|compensation|ctc|pay|earnings|net worth|phone number|home address)\b",
    re.IGNORECASE,
)

QUERY_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "did", "do", "does",
    "for", "from", "has", "have", "he", "her", "him", "his", "how", "i", "in",
    "is", "it", "its", "me", "my", "of", "on", "or", "our", "please", "she",
    "should", "so", "tell", "than", "that", "the", "their", "them", "then",
    "there", "these", "they", "this", "to", "up", "us", "was", "we", "were",
    "what", "when", "where", "which", "who", "whom", "why", "will", "with",
    "would", "you", "your", "about", "know", "give", "show", "much", "many",
    "any", "get", "got", "current", "currently",
}

CATEGORY_HREFS = {
    "profile": "/#about",
    "education": "/#about",
    "experience": "/#experience",
    "skills": "/#skills",
    "projects": "/#work",
    "research": "/#about",
    "approach": "/#about",
    "positioning": "/#about",
    "faq": "/#work",
    "contact": "/#contact",
    "general": "/#about",
}


class RAGError(RuntimeError):
    """A safe, user-facing retrieval failure.

    The message is safe to show to an administrator. Internal exception details
    are logged and never returned to visitors.
    """


@dataclass(frozen=True)
class KnowledgeChunk:
    id: str
    text: str
    heading: str
    section: str
    heading_path: str
    category: str
    visibility: str
    source: str
    chunk_index: int
    token_count: int

    @property
    def embedding_text(self) -> str:
        return f"{self.heading_path}\n{self.text}"

    def metadata(self) -> dict[str, str | int]:
        return {
            "source": self.source,
            "section": self.section,
            "heading": self.heading,
            "headingPath": self.heading_path,
            "category": self.category,
            "visibility": self.visibility,
            "chunkIndex": self.chunk_index,
            "tokenCount": self.token_count,
            "href": CATEGORY_HREFS.get(self.category, "/#about"),
        }


@dataclass(frozen=True)
class RetrievedChunk:
    id: str
    text: str
    heading: str
    section: str
    heading_path: str
    category: str
    source: str
    href: str
    score: float

    def as_source(self) -> dict[str, str]:
        snippet = self.text.strip()
        if len(snippet) > 180:
            snippet = snippet[:177].rsplit(" ", 1)[0] + "…"
        title = self.heading if self.heading and self.heading != self.section else self.section
        return {"title": title, "href": self.href, "snippet": snippet}

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "heading": self.heading,
            "section": self.section,
            "headingPath": self.heading_path,
            "category": self.category,
            "source": self.source,
            "href": self.href,
            "score": round(self.score, 4),
        }


@dataclass
class _Block:
    path: list[str]
    lines: list[str]


def estimate_tokens(text: str) -> int:
    """Cheap English token estimate used only for chunk sizing.

    The embedding model truncates at its own token limit. A word-based estimate
    keeps ingestion deterministic and avoids loading a tokenizer just to split
    a small Markdown file.
    """
    words = len(re.findall(r"\S+", text))
    return max(1, math.ceil(words * 1.3))


def _clean_markdown(text: str) -> str:
    text = IMAGE_RE.sub("", text)
    text = LINK_RE.sub(lambda match: f"{match.group(1)} ({match.group(2)})", text)
    text = INLINE_CODE_RE.sub(r"\1", text)
    text = BOLD_RE.sub(r"\1", text)
    text = ITALIC_RE.sub(r"\1", text)
    text = BULLET_RE.sub("- ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _blocks(markdown: str) -> list[_Block]:
    blocks: list[_Block] = []
    stack: list[tuple[int, str]] = []
    current: _Block | None = None

    def flush() -> None:
        nonlocal current
        if current and any(line.strip() for line in current.lines):
            blocks.append(current)
        current = None

    for line in markdown.splitlines():
        match = HEADING_RE.match(line)
        if match:
            flush()
            level = len(match.group(1))
            title = match.group(2).strip()
            stack = [(lvl, name) for lvl, name in stack if lvl < level]
            stack.append((level, title))
            current = _Block([name for _lvl, name in stack], [])
            continue
        if current is None:
            current = _Block([], [])
        current.lines.append(line)

    flush()
    return blocks


def _category(path: list[str]) -> str:
    haystack = " ".join(path).lower()
    for category, keywords in CATEGORY_RULES:
        if any(keyword in haystack for keyword in keywords):
            return category
    return "general"


def _visibility(path: list[str]) -> str:
    haystack = " ".join(path).lower()
    if any(keyword in haystack for keyword in INTERNAL_HEADINGS):
        return "internal"
    # The document-level preamble explains sourcing and use policy. It is not
    # useful to a visitor and names private working files.
    if len(path) <= 1:
        return "internal"
    return "public"


def _chunk_words(words: list[str], target_words: int, overlap_words: int) -> list[str]:
    if len(words) <= target_words:
        return [" ".join(words)]
    chunks: list[str] = []
    start = 0
    step = max(1, target_words - overlap_words)
    while start < len(words):
        end = min(len(words), start + target_words)
        if end < len(words):
            # Prefer a sentence boundary close to the target size.
            window_end = min(len(words), end + 40)
            boundary = end
            for index in range(end, window_end):
                if SENTENCE_END_RE.search(words[index]):
                    boundary = index + 1
                    break
            end = boundary
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        start = max(start + 1, end - overlap_words)
    return chunks


def ingest_markdown(markdown: str, source: str = "knowledge.md") -> list[KnowledgeChunk]:
    target_words = max(40, int(settings.rag_chunk_tokens / 1.3))
    overlap_words = max(10, int(settings.rag_chunk_overlap / 1.3))
    chunks: list[KnowledgeChunk] = []

    prepared: list[dict[str, Any]] = []
    for block in _blocks(markdown):
        text = _clean_markdown("\n".join(block.lines))
        if not text:
            continue
        path = block.path or [source]
        parent = path[1] if len(path) > 1 else path[0]
        prepared.append(
            {
                "path": path,
                "parent": parent,
                "heading": path[-1],
                "category": _category(path),
                "visibility": _visibility(path),
                "text": text,
            }
        )

    # Merge consecutive small sibling sections into parent-sized chunks. This
    # keeps 400–700-token context blocks while preserving the heading path and
    # child headings inside the text for precise citations.
    groups: list[list[dict[str, Any]]] = []
    for item in prepared:
        key = (item["parent"], item["category"], item["visibility"])
        if (
            groups
            and (groups[-1][0]["parent"], groups[-1][0]["category"], groups[-1][0]["visibility"]) == key
            and estimate_tokens(" ".join(part["text"] for part in groups[-1])) < 500
        ):
            groups[-1].append(item)
        else:
            groups.append([item])

    for group in groups:
        parent = group[0]["parent"]
        category = group[0]["category"]
        visibility = group[0]["visibility"]
        children = []
        for item in group:
            if item["heading"] not in children:
                children.append(item["heading"])
        if len(group) == 1:
            heading = group[0]["heading"]
            heading_path = " > ".join(group[0]["path"][1:] or group[0]["path"])
        else:
            heading = parent
            heading_path = f"{parent} > " + " / ".join(children[:5])
            if len(children) > 5:
                heading_path += " / …"
        combined = "\n\n".join(
            f"{item['heading']}\n{item['text']}" if len(group) > 1 else item["text"]
            for item in group
        )
        for piece in _chunk_words(combined.split(), target_words, overlap_words):
            index = len(chunks)
            digest = hashlib.sha256(
                f"{source}|{heading_path}|{index}|{piece[:160]}".encode("utf-8")
            ).hexdigest()[:24]
            chunks.append(
                KnowledgeChunk(
                    id=f"kb-{digest}",
                    text=piece,
                    heading=heading,
                    section=parent,
                    heading_path=heading_path,
                    category=category,
                    visibility=visibility,
                    source=source,
                    chunk_index=index,
                    token_count=estimate_tokens(piece),
                )
            )
    return chunks


class EmbeddingProvider:
    """Lazy, process-wide Sentence Transformer with an offline hash fallback."""

    def __init__(self, model_name: str, backend: str) -> None:
        self.model_name = model_name
        self.backend = backend
        self._model: Any | None = None
        self._lock = threading.Lock()

    @property
    def effective_backend(self) -> str:
        return self.backend

    def _load_model(self) -> Any:
        if self._model is not None:
            return self._model
        with self._lock:
            if self._model is not None:
                return self._model
            from sentence_transformers import SentenceTransformer

            try:
                model = SentenceTransformer(
                    self.model_name,
                    device="cpu",
                    local_files_only=True,
                )
            except Exception:
                # First run on a fresh machine: allow one download attempt.
                log.info("Embedding model not cached; downloading %s", self.model_name)
                model = SentenceTransformer(self.model_name, device="cpu")
            self._model = model
            return model

    def _hash_embedding(self, text: str) -> list[float]:
        vector = [0.0] * 384
        for token in re.findall(r"[a-z0-9]+", text.lower()):
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
            index = int.from_bytes(digest[:4], "little") % len(vector)
            sign = 1.0 if digest[4] & 1 else -1.0
            vector[index] += sign
        norm = math.sqrt(sum(value * value for value in vector))
        if norm:
            vector = [value / norm for value in vector]
        return vector

    def encode(self, texts: Iterable[str]) -> list[list[float]]:
        items = list(texts)
        if not items:
            return []
        if self.backend == "hash":
            return [self._hash_embedding(text) for text in items]
        model = self._load_model()
        vectors = model.encode(
            items,
            normalize_embeddings=True,
            batch_size=32,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return [vector.tolist() for vector in vectors]


class RAGStore:
    def __init__(
        self,
        *,
        knowledge_path: str | Path | None = None,
        chroma_dir: str | Path | None = None,
        collection_name: str | None = None,
        embedding_model: str | None = None,
        embedding_backend: str | None = None,
        top_k: int | None = None,
        similarity_threshold: float | None = None,
    ) -> None:
        self.knowledge_path = Path(knowledge_path or settings.knowledge_path)
        self.chroma_dir = Path(chroma_dir or settings.chroma_dir)
        self.collection_name = collection_name or settings.rag_collection
        self.top_k = top_k or settings.rag_top_k
        self.similarity_threshold = (
            settings.rag_similarity_threshold
            if similarity_threshold is None
            else similarity_threshold
        )
        self.embedder = EmbeddingProvider(
            embedding_model or settings.rag_embedding_model,
            embedding_backend or settings.rag_embedding_backend,
        )
        self._client: Any | None = None
        self._collection: Any | None = None
        self._lock = threading.RLock()
        self._last_error: str | None = None
        self._last_indexed_at: str | None = None

    @property
    def manifest_path(self) -> Path:
        return self.chroma_dir / "manifest.json"

    def _read_manifest(self) -> dict[str, Any]:
        try:
            return json.loads(self.manifest_path.read_text("utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}

    def _write_manifest(self, manifest: dict[str, Any]) -> None:
        self.chroma_dir.mkdir(parents=True, exist_ok=True)
        temporary = self.manifest_path.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(manifest, indent=2, sort_keys=True), "utf-8")
        temporary.replace(self.manifest_path)

    def document_hash(self) -> str | None:
        try:
            return hashlib.sha256(self.knowledge_path.read_bytes()).hexdigest()
        except OSError:
            return None

    def _get_collection(self) -> Any:
        if self._collection is not None:
            return self._collection
        with self._lock:
            if self._collection is not None:
                return self._collection
            try:
                import chromadb
                from chromadb.config import Settings as ChromaSettings

                self.chroma_dir.mkdir(parents=True, exist_ok=True)
                self._client = chromadb.PersistentClient(
                    path=str(self.chroma_dir),
                    settings=ChromaSettings(anonymized_telemetry=False),
                )
                self._collection = self._client.get_or_create_collection(
                    name=self.collection_name,
                    embedding_function=None,
                    metadata={"hnsw:space": "cosine"},
                )
                return self._collection
            except Exception as exc:
                self._last_error = "Vector index unavailable."
                log.exception("Could not open the Chroma collection")
                raise RAGError("Vector index unavailable.") from exc

    def status(self) -> dict[str, Any]:
        manifest = self._read_manifest()
        current_hash = self.document_hash()
        stored_hash = manifest.get("documentHash")
        available = self.knowledge_path.is_file()
        chunks = int(manifest.get("chunks") or 0)
        try:
            indexed_chunks = int(self._get_collection().count()) if available else 0
        except RAGError:
            indexed_chunks = 0
        indexed = bool(
            chunks and indexed_chunks and stored_hash and chunks == indexed_chunks
        )
        return {
            "enabled": settings.rag_enabled,
            "available": available,
            "indexed": indexed,
            "stale": bool(available and current_hash and stored_hash != current_hash),
            "source": self.knowledge_path.name,
            "chunks": indexed_chunks or chunks,
            "publicChunks": int(manifest.get("publicChunks") or 0),
            "internalChunks": int(manifest.get("internalChunks") or 0),
            "lastIndexedAt": manifest.get("indexedAt") or self._last_indexed_at,
            "documentHash": (current_hash or "")[:16] or None,
            "embeddingModel": self.embedder.model_name,
            "embeddingBackend": self.embedder.effective_backend,
            "collection": self.collection_name,
            "topK": self.top_k,
            "similarityThreshold": self.similarity_threshold,
            "error": self._last_error,
        }

    def ensure_index(self, force: bool = False) -> dict[str, Any]:
        if not settings.rag_enabled:
            return self.status()
        if not self.knowledge_path.is_file():
            self._last_error = "Knowledge base file not found."
            return self.status()
        current_hash = self.document_hash()
        manifest = self._read_manifest()
        if not force and current_hash and manifest.get("documentHash") == current_hash:
            try:
                if int(self._get_collection().count()) == int(manifest.get("chunks") or 0):
                    self._last_error = None
                    return self.status()
            except RAGError:
                return self.status()
        if not settings.rag_auto_reindex and not force:
            return self.status()
        return self.reindex()

    def reindex(self) -> dict[str, Any]:
        with self._lock:
            try:
                markdown = self.knowledge_path.read_text("utf-8")
            except OSError as exc:
                self._last_error = "Knowledge base file not found."
                log.warning("Knowledge base unavailable: %s", exc)
                return self.status()

            try:
                chunks = ingest_markdown(markdown, self.knowledge_path.name)
                if not chunks:
                    raise RAGError("The knowledge base produced no chunks.")
                vectors = self.embedder.encode(chunk.embedding_text for chunk in chunks)
                if len(vectors) != len(chunks):
                    raise RAGError("Embedding count did not match chunk count.")

                import chromadb

                self.chroma_dir.mkdir(parents=True, exist_ok=True)
                if self._client is None:
                    from chromadb.config import Settings as ChromaSettings

                    self._client = chromadb.PersistentClient(
                        path=str(self.chroma_dir),
                        settings=ChromaSettings(anonymized_telemetry=False),
                    )
                try:
                    self._client.delete_collection(self.collection_name)
                except Exception:
                    pass
                self._collection = self._client.get_or_create_collection(
                    name=self.collection_name,
                    embedding_function=None,
                    metadata={"hnsw:space": "cosine"},
                )
                batch_size = 64
                for start in range(0, len(chunks), batch_size):
                    batch = chunks[start : start + batch_size]
                    self._collection.add(
                        ids=[chunk.id for chunk in batch],
                        embeddings=vectors[start : start + batch_size],
                        documents=[chunk.text for chunk in batch],
                        metadatas=[chunk.metadata() for chunk in batch],
                    )

                public = sum(1 for chunk in chunks if chunk.visibility == "public")
                manifest = {
                    "source": self.knowledge_path.name,
                    "documentHash": hashlib.sha256(markdown.encode("utf-8")).hexdigest(),
                    "indexedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "chunks": len(chunks),
                    "publicChunks": public,
                    "internalChunks": len(chunks) - public,
                    "embeddingModel": self.embedder.model_name,
                    "embeddingBackend": self.embedder.effective_backend,
                    "collection": self.collection_name,
                }
                self._write_manifest(manifest)
                self._last_error = None
                self._last_indexed_at = str(manifest["indexedAt"])
                log.info(
                    "Knowledge base indexed · chunks=%s public=%s model=%s",
                    len(chunks),
                    public,
                    self.embedder.model_name,
                )
                return self.status()
            except Exception as exc:
                self._last_error = "Knowledge base indexing failed."
                log.exception("Knowledge base indexing failed")
                raise RAGError("Knowledge base indexing failed.") from exc

    def search(
        self,
        query: str,
        *,
        top_k: int | None = None,
        threshold: float | None = None,
    ) -> list[RetrievedChunk]:
        if not settings.rag_enabled or not query.strip():
            return []
        if UNSUPPORTED_QUERY_RE.search(query):
            return []
        limit = top_k or self.top_k
        minimum = self.similarity_threshold if threshold is None else threshold
        terms = [
            term
            for term in re.findall(r"[a-z0-9+#.]+", query.lower())
            if len(term) > 1 and term not in QUERY_STOPWORDS
        ]
        expanded = set(terms)
        for term in terms:
            expanded.update(QUERY_ALIASES.get(term, ()))
        hinted_categories = {
            category
            for category, keywords in CATEGORY_HINTS
            if any(term in expanded or term in terms for term in keywords)
        }
        try:
            self.ensure_index()
            collection = self._get_collection()
            if collection.count() == 0:
                return []
            vector = self.embedder.encode([query])[0]
            response = collection.query(
                query_embeddings=[vector],
                n_results=min(max(limit * 4, 16), collection.count()),
                where={"visibility": "public"},
                include=["documents", "metadatas", "distances"],
            )
        except RAGError:
            return []
        except Exception:
            self._last_error = "Semantic retrieval unavailable."
            log.exception("Semantic retrieval failed")
            return []

        ids = (response.get("ids") or [[]])[0]
        documents = (response.get("documents") or [[]])[0]
        metadatas = (response.get("metadatas") or [[]])[0]
        distances = (response.get("distances") or [[]])[0]
        results: list[RetrievedChunk] = []
        for chunk_id, document, metadata, distance in zip(ids, documents, metadatas, distances):
            semantic = 1.0 - float(distance)
            text = str(document or "")
            heading_path = str(metadata.get("headingPath") or "")
            category = str(metadata.get("category") or "general")
            haystack = f"{heading_path} {text} {category}".lower()
            overlap = sum(1 for term in expanded if term in haystack)
            lexical = overlap / max(len(expanded), 1)
            phrase = " ".join(terms)
            if phrase and phrase in haystack:
                lexical += 0.35
            category_boost = 0.18 if category in hinted_categories else 0.0
            if semantic < 0.12 and lexical < 0.20:
                continue
            score = min(1.0, semantic + (0.22 * min(lexical, 1.2)) + category_boost)
            if score < minimum:
                continue
            results.append(
                RetrievedChunk(
                    id=str(chunk_id),
                    text=text,
                    heading=str(metadata.get("heading") or ""),
                    section=str(metadata.get("section") or ""),
                    heading_path=heading_path,
                    category=category,
                    source=str(metadata.get("source") or self.knowledge_path.name),
                    href=str(metadata.get("href") or "/#about"),
                    score=score,
                )
            )
        results.sort(key=lambda item: item.score, reverse=True)
        if not results:
            return []
        # Keep the context focused: never pad the prompt with chunks far below
        # the best match just because they cleared the absolute threshold.
        floor = max(minimum, results[0].score - 0.22)
        return [result for result in results if result.score >= floor][:limit]


def is_unsupported_query(query: str) -> bool:
    return bool(UNSUPPORTED_QUERY_RE.search(query))


def build_context(results: list[RetrievedChunk], max_chars: int | None = None) -> str:
    budget = max_chars or settings.rag_max_context_chars
    blocks: list[str] = []
    used = 0
    for index, result in enumerate(results, start=1):
        block = (
            f"[{index}] {result.heading_path} "
            f"(category: {result.category}, relevance: {result.score:.2f})\n{result.text}"
        )
        if used + len(block) > budget:
            continue
        blocks.append(block)
        used += len(block)
    return "\n\n".join(blocks) if blocks else "No matching knowledge-base records."


def _relevant_excerpt(text: str, query: str, max_chars: int = 800) -> str:
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+|\n+", re.sub(r"[ \t]+", " ", text))
        if sentence.strip()
    ]
    if not sentences:
        return ""
    terms = {
        term
        for term in re.findall(r"[a-z0-9+#.]+", query.lower())
        if len(term) > 1 and term not in QUERY_STOPWORDS
    }
    expanded = set(terms)
    for term in terms:
        expanded.update(QUERY_ALIASES.get(term, ()))
    caveat_re = re.compile(
        r"\b(not recorded|not confirmed|not established|not published|need confirmation|"
        r"confirm|verify|current status|do not|no detailed)\b",
        re.IGNORECASE,
    )
    scored: list[tuple[float, int]] = []
    caveat_indices: list[int] = []
    for index, sentence in enumerate(sentences):
        haystack = sentence.lower()
        score = float(sum(1 for term in expanded if term in haystack))
        if query.strip().lower() in haystack:
            score += 2.0
        if caveat_re.search(sentence):
            score += 2.0
            caveat_indices.append(index)
        scored.append((score, index))
    scored.sort(key=lambda item: item[0], reverse=True)
    chosen = sorted(index for score, index in scored[:4] if score > 0) or list(
        range(min(2, len(sentences)))
    )
    # A project answer without its status caveat is worse than a shorter answer.
    if caveat_indices and not any(index in chosen for index in caveat_indices):
        chosen = sorted(set(chosen[:3] + [caveat_indices[0]]))
    excerpt = ""
    for index in chosen:
        candidate = sentences[index]
        if len(excerpt) + len(candidate) + 1 > max_chars:
            continue
        excerpt = f"{excerpt} {candidate}".strip()
    if not excerpt:
        excerpt = " ".join(sentences[i] for i in chosen)[:max_chars]
    return excerpt


def answer_from_knowledge(
    results: list[RetrievedChunk], query: str, fallback_contact: str = ""
) -> str:
    if not results:
        return (
            "I don't have verified information about that in Somanadh's professional profile. "
            f"You can contact him for more details{f' at {fallback_contact}' if fallback_contact else ''}."
        )
    parts: list[str] = []
    for result in results[:2]:
        excerpt = _relevant_excerpt(result.text, query)
        if not excerpt:
            continue
        parts.append(f"{result.heading_path}:\n{excerpt}")
    return (
        "From the verified knowledge base:\n\n"
        + "\n\n".join(parts)
        + "\n\nThat is what the published record supports. Ask a narrower question if you need more detail."
    )


_store: RAGStore | None = None
_store_lock = threading.Lock()


def get_store() -> RAGStore:
    global _store
    if _store is None:
        with _store_lock:
            if _store is None:
                _store = RAGStore()
    return _store


def reset_store_for_tests() -> None:
    """Drop the process-wide store so tests can point at isolated paths."""
    global _store
    with _store_lock:
        _store = None


async def search_knowledge(query: str, top_k: int | None = None) -> list[RetrievedChunk]:
    return await asyncio.to_thread(get_store().search, query, top_k=top_k)


async def knowledge_status() -> dict[str, Any]:
    return await asyncio.to_thread(get_store().status)


async def reindex_knowledge() -> dict[str, Any]:
    return await asyncio.to_thread(get_store().ensure_index, True)


async def ensure_knowledge_index() -> dict[str, Any]:
    return await asyncio.to_thread(get_store().ensure_index)
