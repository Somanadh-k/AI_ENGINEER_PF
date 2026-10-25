from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.rag import RAGStore, answer_from_knowledge, ingest_markdown

KNOWLEDGE = (
    Path(__file__).resolve().parents[1]
    / "knowledge"
    / "Somanadh_Portfolio_RAG_Knowledge_Base.md"
)


def streamed_text(response) -> str:
    pieces: list[str] = []
    for line in response.text.splitlines():
        if not line.startswith("data:"):
            continue
        try:
            payload = json.loads(line[5:].strip())
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict) and isinstance(payload.get("text"), str):
            pieces.append(payload["text"])
    return "".join(pieces)


@pytest.fixture(scope="module")
def store(tmp_path_factory) -> RAGStore:
    directory = tmp_path_factory.mktemp("rag-store")
    rag = RAGStore(
        knowledge_path=KNOWLEDGE,
        chroma_dir=directory / "chroma",
        similarity_threshold=0.30,
    )
    rag.reindex()
    return rag


def test_ingestion_preserves_headings_metadata_and_privacy() -> None:
    chunks = ingest_markdown(KNOWLEDGE.read_text("utf-8"), KNOWLEDGE.name)

    assert len(chunks) >= 15
    assert len({chunk.id for chunk in chunks}) == len(chunks)
    assert all(chunk.source == KNOWLEDGE.name for chunk in chunks)
    assert all(chunk.token_count <= 700 for chunk in chunks)
    assert any(chunk.category == "education" for chunk in chunks)
    assert any(chunk.category == "experience" for chunk in chunks)
    assert any(chunk.category == "projects" for chunk in chunks)
    assert any("Vardhaman" in chunk.text for chunk in chunks)

    public = [chunk for chunk in chunks if chunk.visibility == "public"]
    internal = [chunk for chunk in chunks if chunk.visibility == "internal"]
    assert public and internal
    assert all(
        "details to verify" not in chunk.heading_path.lower()
        and "rag retrieval and answer rules" not in chunk.heading_path.lower()
        and "source note" not in chunk.heading_path.lower()
        for chunk in public
    )
    assert all(chunk.metadata()["visibility"] == "public" for chunk in public)
    assert any("Munchable" in chunk.text for chunk in internal)


def test_embedding_creation_is_normalized(store: RAGStore) -> None:
    vector = store.embedder.encode(["Somanadh studies at Vardhaman College of Engineering."])[0]

    assert len(vector) == 384
    norm = sum(value * value for value in vector) ** 0.5
    assert abs(norm - 1.0) < 1e-3


def test_semantic_retrieval_for_required_questions(store: RAGStore) -> None:
    cases = {
        "Who is Somanadh?": ("profile", "Somanadh K"),
        "Where does he study?": ("education", "Vardhaman"),
        "What does he do as an AI engineer?": ("experience", "SooperVision"),
        "What is QEMS?": ("projects", "QEMS"),
        "What is AgenticOps?": ("projects", "AgenticOps"),
        "What projects has he worked on?": ("projects", "StudentOS"),
        "What leadership experience does he have?": ("experience", "IEEE"),
        "Has he published research?": ("research", "No publication is confirmed"),
        "What is StudentOS?": ("projects", "StudentOS"),
        "What is his tech stack?": ("skills", "FastAPI"),
        "What is his approach to solving engineering problems?": ("approach", "Prefers building"),
        "How can someone contact him?": ("contact", "skollavajjala@gmail.com"),
    }
    for question, (category, needle) in cases.items():
        results = store.search(question, top_k=3)
        assert results, question
        combined = " ".join(result.text for result in results)
        assert needle.lower() in combined.lower(), question
        assert results[0].category == category, (question, results[0].category)


def test_unsupported_and_private_questions_return_no_context(store: RAGStore) -> None:
    assert store.search("What is his current salary?", top_k=5) == []
    assert store.search("What is his favourite football team?", top_k=5) == []

    private = store.search("Munchable.tv GoodMonk H50", top_k=5)
    assert all("Munchable" not in result.text for result in private)


def test_document_change_detection_and_reindex(tmp_path: Path) -> None:
    knowledge = tmp_path / "knowledge.md"
    knowledge.write_text(
        "# Test Profile\n\n## Experience\n\nSomanadh worked on backend systems.\n",
        "utf-8",
    )
    rag = RAGStore(
        knowledge_path=knowledge,
        chroma_dir=tmp_path / "chroma",
        similarity_threshold=0.0,
    )
    first = rag.ensure_index()
    assert first["indexed"] is True
    assert first["chunks"] == 1

    knowledge.write_text(
        "# Test Profile\n\n## Experience\n\nSomanadh worked on backend systems.\n\n"
        "## Education\n\nSomanadh studied computer science at Vardhaman.\n",
        "utf-8",
    )
    second = rag.ensure_index()
    assert second["chunks"] >= 2
    assert second["documentHash"] != first["documentHash"]


def test_chat_uses_semantic_retrieval_and_grounded_fallback(client: TestClient) -> None:
    response = client.post(
        "/api/ai/chat",
        json={"messages": [{"role": "user", "content": "Where does he study?"}]},
    )
    assert response.status_code == 200
    text = response.text
    assert '"retrieval": "semantic"' in text
    assert '"knowledgeChunks":' in text
    assert "Vardhaman" in streamed_text(response)


def test_chat_refuses_unsupported_salary_and_keeps_project_status(client: TestClient) -> None:
    salary = client.post(
        "/api/ai/chat",
        json={"messages": [{"role": "user", "content": "What is his current salary?"}]},
    )
    salary_text = streamed_text(salary)
    assert "don't have verified information" in salary_text
    assert "₹" not in salary_text

    qems = client.post(
        "/api/ai/chat",
        json={"messages": [{"role": "user", "content": "What is QEMS?"}]},
    )
    qems_text = streamed_text(qems)
    assert "Quality Error Management" in qems_text
    assert "concept" in qems_text.lower()
    assert "not recorded" in qems_text.lower() or "not confirmed" in qems_text.lower()


def test_chat_research_question_does_not_claim_publication(client: TestClient) -> None:
    response = client.post(
        "/api/ai/chat",
        json={"messages": [{"role": "user", "content": "Has he published research?"}]},
    )
    text = streamed_text(response)
    assert "No publication is confirmed" in text


def test_admin_knowledge_status_and_reindex(admin_client: TestClient) -> None:
    status_response = admin_client.get("/api/admin/knowledge")
    assert status_response.status_code == 200

    status = status_response.json()
    assert status["available"] is True
    assert status["chunks"] > 0
    assert status["embeddingModel"] == "all-MiniLM-L6-v2"

    reindexed = admin_client.post("/api/admin/knowledge/reindex")
    assert reindexed.status_code == 200
    body = reindexed.json()
    assert body["ok"] is True
    assert body["knowledge"]["chunks"] == status["chunks"]


def test_admin_knowledge_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/admin/knowledge").status_code == 401
    assert client.post("/api/admin/knowledge/reindex").status_code == 401


def test_openrouter_failure_returns_labelled_grounded_fallback(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "openrouter_api_key", "test-key-not-used")
    monkeypatch.setattr(settings, "openrouter_model", "test/model")
    monkeypatch.setattr(settings, "openrouter_base_url", "http://127.0.0.1:9/api/v1")
    monkeypatch.setattr(settings, "ai_timeout_seconds", 1.0)

    response = client.post(
        "/api/ai/chat",
        json={"messages": [{"role": "user", "content": "Where does he study?"}]},
    )
    text = response.text
    assert "event: error" in text
    assert '"recovered": true' in text
    streamed = streamed_text(response)
    assert "can't reach the live model" in streamed
    assert "Vardhaman" in streamed


def test_answer_from_knowledge_includes_caveats(store: RAGStore) -> None:
    results = store.search("What is QEMS?", top_k=2)
    answer = answer_from_knowledge(results, "What is QEMS?")
    assert "Quality Error Management" in answer
    assert "not recorded" in answer.lower() or "not confirmed" in answer.lower()
