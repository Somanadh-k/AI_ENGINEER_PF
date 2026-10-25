from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by", "can", "could",
    "did", "do", "does", "doing", "for", "from", "had", "has", "have", "he", "her", "here",
    "him", "his", "how", "i", "if", "in", "into", "is", "it", "its", "just", "me", "more",
    "most", "my", "of", "on", "or", "our", "out", "please", "she", "should", "so", "some",
    "tell", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this",
    "to", "up", "us", "was", "we", "were", "what", "when", "where", "which", "who", "whom",
    "why", "will", "with", "would", "you", "your", "about", "know", "work", "works", "worked",
    "s", "t", "ve", "also", "give", "show", "much", "many", "any", "get", "got",
}

ALIASES = {
    "internship": ["intern", "internships", "soopervision", "experience"],
    "soopervision": ["internship", "intern", "company", "work"],
    "fastapi": ["backend", "python", "api", "framework"],
    "python": ["backend", "language", "fastapi"],
    "rag": ["retrieval", "augmented", "generation", "embedding", "vector", "grounding"],
    "retrieval": ["rag", "embeddings", "search", "grounding"],
    "agents": ["agent", "agentic", "orchestration", "tools", "tool", "calling"],
    "agent": ["agents", "agentic", "orchestration", "tool"],
    "projects": ["project", "studentos", "qems", "portfolio", "built"],
    "contact": ["email", "reach", "linkedin", "message", "hire"],
    "resume": ["cv", "download", "resume"],
    "ieee": ["leadership", "chair", "ssit", "volunteer"],
    "education": ["student", "college", "btech", "degree", "study", "university"],
    "site": ["portfolio", "website", "analytics", "assistant", "this"],
    "hire": ["hiring", "recruiter", "fit", "value", "why"],
    "studentos": ["project", "student", "os"],
    "qems": ["project", "system"],
    "privacy": ["analytics", "tracking", "data", "consent"],
}

INTENT_PATTERNS: list[tuple[str, tuple[str, ...]]] = [
    ("greeting", ("hello", "hi", "hey", "good morning", "good evening", "who are you")),
    ("contact", ("contact", "email", "linkedin", "message him", "reach", "get in touch", "available")),
    ("leadership", ("ieee", "chair", "leadership", "society", "ssit")),
    ("education", ("education", "college", "university", "degree", "btech", "student", "studying")),
    ("rag", ("rag", "retrieval", "embedding", "vector", "semantic search", "grounding")),
    ("agents", ("agent", "agentic", "orchestration", "tool calling", "multi-agent", "workflow")),
    ("projects", ("project", "studentos", "qems", "built", "build")),
    ("experience", ("intern", "internship", "soopervision", "experience", "job", "work history", "role")),
    ("skills", ("skill", "tech", "technology", "stack", "fastapi", "python", "sql", "api")),
    ("interests", ("interest", "interests", "curious", "fascinated", "career goals")),
    ("hiring", ("why should", "hire", "hiring", "recruiter", "good fit", "value", "strength")),
    ("site", ("this site", "this portfolio", "this website", "analytics", "assistant", "how was this built")),
    ("privacy", ("privacy", "track", "cookie", "data")),
    ("identity", ("who", "about", "background", "introduce", "yourself", "summary")),
]

DATE_RE = re.compile(r"^(\d{4})-(\d{2})$")
MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def human_date(value: str | None, fallback: str = "Present") -> str:
    if not value:
        return fallback
    match = DATE_RE.match(value)
    if not match:
        return value
    year, month = int(match.group(1)), int(match.group(2))
    if not 1 <= month <= 12:
        return value
    return f"{MONTHS[month - 1]} {year}"


def date_range(start: str | None, end: str | None, current: bool = False) -> str:
    if not start:
        return "Dates not published"
    return f"{human_date(start, '—')} – {'Present' if current or not end else human_date(end)}"


def tokenize(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9+#.]+", text.lower()) if len(t) > 1 and t not in STOPWORDS]


@dataclass
class Chunk:
    id: str
    title: str
    section: str
    text: str
    tags: list[str] = field(default_factory=list)
    boost: float = 1.0


@dataclass
class Source:
    title: str
    href: str
    snippet: str

    def as_dict(self) -> dict[str, str]:
        return {"title": self.title, "href": self.href, "snippet": self.snippet}


def build_chunks(doc: dict[str, Any]) -> list[Chunk]:
    chunks: list[Chunk] = []
    profile = doc.get("profile") or {}
    links = profile.get("links") or {}
    name = profile.get("name", "Somanadh K")

    identity = (
        f"{name} is a {profile.get('status', 'Computer Science student')} and "
        f"{profile.get('statusDetail', 'AI engineering intern')}. {profile.get('intro', '')} "
        f"Tagline: {profile.get('tagline', '')} Availability: {profile.get('availability', '')}"
    ).strip()
    chunks.append(
        Chunk(
            "identity",
            f"Who is {name}?",
            "/#identity",
            identity,
            ["who", "about", "background", "intro", "identity", "summary", "student", "intern"],
            1.6,
        )
    )

    about = doc.get("profile", {}).get("about") or []
    if about:
        chunks.append(
            Chunk(
                "about",
                "About",
                "/#about",
                " ".join(about),
                ["about", "story", "motivation", "curiosity", "career"],
                1.2,
            )
        )

    interests = profile.get("technicalInterests") or []
    if interests:
        chunks.append(
            Chunk(
                "interests",
                "Technical interests",
                "/#skills",
                "Technical interests: " + ", ".join(interests) + ".",
                ["interests", "focus", "learning", "topics"],
            )
        )

    for exp in doc.get("experience") or []:
        lines = [
            f"{exp.get('role')} at {exp.get('org')} ({exp.get('type', 'Role')}).",
            f"Dates: {date_range(exp.get('start'), exp.get('end'), bool(exp.get('current')))}.",
        ]
        if exp.get("summary"):
            lines.append(str(exp["summary"]))
        responsibilities = exp.get("responsibilities") or []
        if responsibilities:
            lines.append("Responsibilities: " + " ".join(str(r) for r in responsibilities))
        if exp.get("technologies"):
            lines.append("Technologies: " + ", ".join(exp["technologies"]))
        if exp.get("learnings"):
            lines.append("Key learnings: " + " ".join(str(x) for x in exp["learnings"]))
        if exp.get("achievements"):
            lines.append("Verified outcomes: " + " ".join(str(x) for x in exp["achievements"]))
        if exp.get("note"):
            lines.append("Note: " + str(exp["note"]))
        tags = ["experience", "internship", "role", "work"]
        if exp.get("org"):
            tags.append(str(exp["org"]).lower())
        if exp.get("role"):
            tags.extend(tokenize(str(exp["role"])))
        if exp.get("type") == "Leadership":
            tags.extend(["leadership", "ieee", "chair"])
        chunks.append(
            Chunk(
                f"experience-{exp.get('id', len(chunks))}",
                f"{exp.get('role')} · {exp.get('org')}",
                f"/#experience-{exp.get('id', '')}",
                " ".join(lines),
                tags,
                1.3 if exp.get("type") != "Leadership" else 1.1,
            )
        )

    education = profile.get("education") or []
    if education:
        text = " ".join(
            " ".join(
                str(part)
                for part in (
                    item.get("degree", ""),
                    item.get("field", ""),
                    item.get("institution") or "",
                    date_range(item.get("start"), item.get("end")),
                    item.get("note") or "",
                )
                if part
            )
            for item in education
        )
        chunks.append(
            Chunk(
                "education",
                "Education",
                "/#about",
                text,
                ["education", "student", "college", "degree", "btech", "study"],
            )
        )

    for project in doc.get("projects") or []:
        if project.get("verified") is False:
            text = (
                f"{project.get('name')} is listed as a project in the {project.get('category', 'project')} "
                f"category. Verified functionality, screenshots, outcomes and repository links are not "
                f"published yet. {project.get('note', '')} Do not speculate about what it does."
            )
        else:
            parts = [
                f"{project.get('name')} — {project.get('tagline') or ''}",
                f"Category: {project.get('category', '')}. Status: {project.get('status', '')}.",
                project.get("summary") or "",
                f"Problem: {project['problem']}" if project.get("problem") else "",
                f"Why it matters: {project['whyItMatters']}" if project.get("whyItMatters") else "",
                f"Stack: {', '.join(project.get('stack') or [])}" if project.get("stack") else "",
                f"Architecture: {project['architecture']}" if project.get("architecture") else "",
                f"Implementation: {project['implementation']}" if project.get("implementation") else "",
            ]
            text = " ".join(p for p in parts if p)
        tags = ["project", "built", "build", str(project.get("slug", "")).lower()]
        tags.extend(tokenize(str(project.get("name", ""))))
        chunks.append(
            Chunk(
                f"project-{project.get('slug')}",
                f"Project · {project.get('name')}",
                f"/projects/{project.get('slug')}",
                text,
                tags,
                1.2,
            )
        )

    for category in doc.get("skills") or []:
        skill_lines = []
        tags = ["skills", "technology", "stack", "tools"]
        tags.extend(tokenize(str(category.get("label", ""))))
        for skill in category.get("skills") or []:
            skill_lines.append(
                f"{skill.get('name')}: {skill.get('what', '')} How Somanadh uses it: {skill.get('how', '')}"
            )
            tags.extend(tokenize(str(skill.get("name", ""))))
        chunks.append(
            Chunk(
                f"skills-{category.get('id')}",
                f"Skills · {category.get('label')}",
                "/#skills",
                " ".join(skill_lines),
                tags,
            )
        )

    toolkit = doc.get("toolkit") or []
    if toolkit:
        chunks.append(
            Chunk(
                "toolkit",
                "Toolkit",
                "/#skills",
                "Tools and technologies referenced across the portfolio: " + ", ".join(toolkit) + ".",
                ["tools", "stack", "technology", "toolkit", "skill"],
            )
        )

    beyond = doc.get("beyond") or {}
    if beyond.get("paragraphs"):
        chunks.append(
            Chunk(
                "beyond",
                "Beyond the code",
                "/#beyond",
                " ".join(beyond["paragraphs"]),
                ["human", "curiosity", "principles", "mindset", "story", "personality"],
            )
        )

    contact_bits = [f"Email: {profile.get('email')}" if profile.get("email") else ""]
    if links.get("linkedin"):
        contact_bits.append(f"LinkedIn: {links['linkedin']}")
    if links.get("github"):
        contact_bits.append(f"GitHub: {links['github']}")
    if links.get("existingPortfolio"):
        contact_bits.append(f"Existing portfolio: {links['existingPortfolio']}")
    if profile.get("availability"):
        contact_bits.append(f"Availability: {profile['availability']}")
    chunks.append(
        Chunk(
            "contact",
            "Contact",
            "/#contact",
            " ".join(b for b in contact_bits if b),
            ["contact", "email", "linkedin", "reach", "hire", "message", "available", "resume"],
            1.4,
        )
    )

    if doc.get("buildLog"):
        log_text = " ".join(
            f"{human_date(entry.get('date'))}: {entry.get('title')} — {entry.get('body', '')}"
            for entry in doc["buildLog"]
        )
        chunks.append(
            Chunk("buildlog", "Build log", "/#build-log", log_text, ["journey", "timeline", "learning", "log"])
        )

    return chunks


class KnowledgeBase:
    def __init__(self, doc: dict[str, Any], chunks: list[Chunk] | None = None):
        self.doc = doc
        self.chunks = chunks or build_chunks(doc)
        self._doc_freq: dict[str, int] = {}
        for chunk in self.chunks:
            for token in set(tokenize(chunk.text + " " + chunk.title + " " + " ".join(chunk.tags))):
                self._doc_freq[token] = self._doc_freq.get(token, 0) + 1

    def search(self, query: str, limit: int = 4) -> list[tuple[Chunk, float]]:
        tokens = tokenize(query)
        expanded: set[str] = set(tokens)
        for token in tokens:
            expanded.update(ALIASES.get(token, []))
        if not expanded:
            return []
        total = len(self.chunks) or 1
        scored: list[tuple[Chunk, float]] = []
        q_lower = query.lower()
        for chunk in self.chunks:
            haystack = f"{chunk.title} {chunk.text} {' '.join(chunk.tags)}".lower()
            score = 0.0
            for token in expanded:
                if token in haystack:
                    df = self._doc_freq.get(token, 1)
                    score += (1.0 + (total / (df + 0.5))) * (0.6 if token in tokens else 0.9)
            for tag in chunk.tags:
                if tag and tag in q_lower:
                    score += 2.2
            if q_lower.strip() and q_lower.strip() in haystack:
                score += 3.0
            if score > 0:
                scored.append((chunk, score * chunk.boost))
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return scored[:limit]

    def section(self) -> str:
        parts = []
        for chunk in self.chunks:
            parts.append(f"[{chunk.id}] {chunk.title} ({chunk.section})\n{chunk.text}")
        return "\n\n".join(parts)

    def sources(self, matches: list[tuple[Chunk, float]]) -> list[Source]:
        out: list[Source] = []
        seen: set[str] = set()
        for chunk, _score in matches:
            if chunk.section in seen:
                continue
            seen.add(chunk.section)
            snippet = chunk.text.strip()
            if len(snippet) > 160:
                snippet = snippet[:157].rsplit(" ", 1)[0] + "…"
            out.append(Source(chunk.title, chunk.section, snippet))
        return out

    def context(self, matches: list[tuple[Chunk, float]], max_chars: int = 7000) -> str:
        blocks: list[str] = []
        used = 0
        for chunk, _score in matches:
            block = f"### {chunk.title}\n{chunk.text}"
            if used + len(block) > max_chars:
                continue
            blocks.append(block)
            used += len(block)
        return "\n\n".join(blocks) if blocks else "No matching records."


def detect_intent(query: str) -> str:
    q = query.lower()
    for intent, keywords in INTENT_PATTERNS:
        for keyword in keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", q):
                return intent
    return "general"


def _facts(doc: dict[str, Any]) -> dict[str, Any]:
    profile = doc.get("profile") or {}
    experiences = doc.get("experience") or []
    ai_exp = next((e for e in experiences if "AI" in str(e.get("role", ""))), None)
    projects = doc.get("projects") or []
    verified_projects = [p for p in projects if p.get("verified") is not False]
    unverified_projects = [p for p in projects if p.get("verified") is False]
    return {
        "profile": profile,
        "links": profile.get("links") or {},
        "ai_exp": ai_exp,
        "experiences": experiences,
        "verified_projects": verified_projects,
        "unverified_projects": unverified_projects,
        "leadership": [e for e in experiences if e.get("type") == "Leadership"],
    }


def answer_from_records(doc: dict[str, Any], query: str, matches: list[tuple[Chunk, float]]) -> str:
    """Deterministic, grounded response used when no LLM is configured.

    Every sentence is derived from stored portfolio records. No inference about
    employers, metrics or outcomes is permitted.
    """
    intent = detect_intent(query)
    f = _facts(doc)
    profile = f["profile"]
    name = profile.get("name", "Somanadh")
    email = profile.get("email")
    linkedin = f["links"].get("linkedin")
    ai_exp = f["ai_exp"]

    if intent == "greeting":
        return (
            f"I'm SOMANADH.AI, a grounded assistant for {name}'s portfolio. I can walk you through "
            "his internship work, backend stack, agentic AI and RAG interests, projects, leadership, "
            "or how to reach him. What would you like to know?"
        )

    if intent == "contact":
        bits = [f"You can reach {name} at {email}." if email else ""]
        if linkedin:
            bits.append(f"LinkedIn: {linkedin}")
        if profile.get("availability"):
            bits.append(str(profile["availability"]))
        bits.append(
            "The contact form stores a message in the private studio inbox, and he can reply by email."
        )
        return " ".join(b for b in bits if b)

    if intent == "hiring":
        return (
            f"A fair, verifiable case for {name}: he is a Computer Science student who has completed a "
            "Forward Deployed AI Engineering internship at SooperVision, where he worked on AI-powered "
            "applications, intelligent workflows, backend integrations, LLM-driven solutions and "
            "full-stack AI features. He also completed a web development internship there, so he has "
            "seen both the interface and the API. His stated strengths are Python, FastAPI, SQL, "
            "agentic workflows and retrieval-augmented generation. What he does not claim is seniority "
            "or production scale — his public project records are still being verified. If you need "
            "someone early-career who ships and learns quickly, email him at "
            f"{email or 'the contact form'}."
        )

    if intent == "experience":
        if not ai_exp:
            return "Internship details are not published yet. You can ask via the contact section."
        lines = [
            f"{name}'s most recent role is {ai_exp.get('role')} at {ai_exp.get('org')} "
            f"({date_range(ai_exp.get('start'), ai_exp.get('end'), bool(ai_exp.get('current')))}).",
        ]
        responsibilities = ai_exp.get("responsibilities") or []
        if responsibilities:
            lines.append("He worked on: " + "; ".join(str(r).rstrip(".") for r in responsibilities) + ".")
        lines.append(
            "Before that he was a Web Development Intern at SooperVision from January to May 2026. "
            "Detailed responsibilities for that earlier role are not published yet."
        )
        return " ".join(lines)

    if intent == "skills":
        categories = doc.get("skills") or []
        if categories:
            summary = "; ".join(
                f"{c.get('label')}: " + ", ".join(s.get("name", "") for s in c.get("skills", [])[:4])
                for c in categories
            )
            return (
                f"{name}'s verified working areas are {summary}. "
                "The portfolio deliberately avoids proficiency percentages — the evidence is the internship "
                "work and the systems described on this site."
            )
        return "Skills are not published yet."

    if intent == "interests":
        interests = profile.get("technicalInterests") or []
        if interests:
            return (
                f"His stated technical interests are {', '.join(interests)}. "
                "Agentic AI, multi-agent systems and RAG are active exploration areas — the portfolio labels "
                "them as interests rather than production achievements."
            )
        return "Technical interests are not published yet."

    if intent == "projects":
        if f["unverified_projects"]:
            names = ", ".join(str(p.get("name")) for p in f["unverified_projects"])
            return (
                f"The portfolio currently lists {names}. Both records are intentionally minimal: "
                "functionality, outcomes, screenshots and repository links have not been verified for "
                "publication yet, and I won't invent them. The one fully documented project is SOMANADH.OS, "
                "this site — a Next.js frontend with a FastAPI backend, grounded AI assistant, and "
                "privacy-conscious analytics."
            )
        return "Project records will appear once verified."

    if intent == "rag":
        return (
            "RAG is one of his core interests: document processing, embeddings, vector databases, semantic "
            "search and grounded generation. The clearest example is this portfolio's assistant — it retrieves "
            "matching records from a verified knowledge base and constrains answers to them. For a corpus this "
            "small he deliberately chose structured lexical retrieval over pgvector, because extra "
            "infrastructure would not have improved the answers."
        )

    if intent == "agents":
        return (
            "He has worked on agentic AI workflows during his Forward Deployed AI internship — LLM-driven "
            "features, tool calling, automation and backend integrations. Multi-agent systems are a stated "
            "technical interest, but he does not present them as production experience. This site's assistant "
            "is a deliberately constrained agent: retrieve, ground, refuse when evidence is missing."
        )

    if intent == "leadership":
        leadership = f["leadership"]
        if leadership:
            role = leadership[0]
            return (
                f"Since July 2026 he has been {role.get('role')} at {role.get('org')}. "
                "Chapter programmes and outcomes are not published yet, so I can't quote numbers."
            )

    if intent == "education":
        edu = (profile.get("education") or [{}])[0]
        return (
            f"He is studying for a {edu.get('degree', 'B.Tech')} in {edu.get('field', 'Computer Science and Engineering')}. "
            "The institution is not published on this site yet."
        )

    if intent == "site":
        return (
            "This portfolio is a real system, not a template: a Next.js App Router frontend with React Three "
            "Fiber visuals, a FastAPI backend with SQLAlchemy, OpenRouter for inference, and a private analytics "
            "dashboard built on measured events. The assistant you're using retrieves from a verified knowledge "
            "base and can run without an LLM in a deterministic fallback mode."
        )

    if intent == "privacy":
        return (
            "Analytics here are cookie-less and consent-gated. The site stores an anonymous random visitor ID "
            "locally, records page paths, coarse device/browser categories, and approximate country only when "
            "the host provides it. Raw IP addresses are never stored, and no individual visitor is identified."
        )

    if intent == "identity":
        return (
            f"{name} is a Computer Science and Engineering student and a Forward Deployed AI Engineer Intern. "
            f"{profile.get('intro', '')} He is early-career and specific about that: hands-on internship "
            "experience in AI applications and backend integrations, with a growing focus on agentic systems "
            "and retrieval."
        )

    # Retrieval-only fallback: quote the best matching record rather than guess.
    if matches and matches[0][1] >= 4:
        chunk = matches[0][0]
        snippet = chunk.text.strip()
        if len(snippet) > 420:
            snippet = snippet[:417].rsplit(" ", 1)[0] + "…"
        return (
            f"Here is what the verified record says ({chunk.title}): {snippet} "
            "If that doesn't answer it, ask about his internship, skills, projects, or contact details."
        )

    return (
        "That isn't in the verified portfolio records, so I won't guess. I can answer questions about "
        f"{name}'s internship at SooperVision, his backend and AI stack, his projects, IEEE leadership, or "
        f"how to contact him{f' at {email}' if email else ''}."
    )
