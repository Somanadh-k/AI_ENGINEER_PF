# Hugging Face Spaces (Docker SDK) compatible: non-root uid 1000, port 7860.
FROM python:3.14-slim
RUN useradd -m -u 1000 user && pip install --no-cache-dir uv
USER user
ENV PATH="/home/user/.local/bin:$PATH" HF_HOME=/home/user/hf UV_PROJECT_ENVIRONMENT=/home/user/venv
WORKDIR /home/user/app
COPY --chown=user api/pyproject.toml api/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
# Bake the embedding model into the image so cold starts don't download it.
RUN /home/user/venv/bin/python -c "from sentence_transformers import SentenceTransformer as S; S('all-MiniLM-L6-v2')"
COPY --chown=user api/app ./app
COPY --chown=user api/knowledge ./knowledge
COPY --chown=user content ./content
ENV ENVIRONMENT=production CONTENT_PATH=/home/user/app/content/portfolio.json \
    CHROMA_DIR=/home/user/chroma UPLOAD_DIR=/home/user/uploads RESUME_DIR=/home/user/uploads/resume
EXPOSE 7860
HEALTHCHECK CMD python -c "import urllib.request as u; u.urlopen('http://127.0.0.1:7860/api/health')"
CMD ["/home/user/venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--proxy-headers", "--forwarded-allow-ips=*"]
