# Slim image for 512MB hosts (Render free): hash embeddings, no torch.
# For full semantic RAG: drop --no-group, set RAG_EMBEDDING_BACKEND=sentence-transformers, give it 2GB+ RAM.
FROM python:3.14-slim
RUN useradd -m -u 1000 user && pip install --no-cache-dir uv
# AWS Lambda Web Adapter: inert on Render/other hosts, makes this image run on Lambda.
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter
USER user
ENV PATH="/home/user/.local/bin:$PATH" HF_HOME=/home/user/hf UV_PROJECT_ENVIRONMENT=/home/user/venv
WORKDIR /home/user/app
COPY --chown=user api/pyproject.toml api/uv.lock ./
RUN uv sync --frozen --no-dev --no-group embeddings --no-install-project
COPY --chown=user api/app ./app
COPY --chown=user api/knowledge ./knowledge
COPY --chown=user content ./content
# Lambda runs the container as an arbitrary uid; make the app readable by anyone.
RUN chmod -R a+rX /home/user
ENV ENVIRONMENT=production RAG_EMBEDDING_BACKEND=hash CONTENT_PATH=/home/user/app/content/portfolio.json \
    CHROMA_DIR=/home/user/chroma UPLOAD_DIR=/home/user/uploads RESUME_DIR=/home/user/uploads/resume
HEALTHCHECK CMD python -c "import urllib.request as u; u.urlopen('http://127.0.0.1:8080/api/health')"
CMD ["sh", "-c", "exec /home/user/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips=*"]
