FROM python:3.12-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

RUN uv venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

COPY uv.lock .
COPY pyproject.toml .
RUN uv sync --frozen --no-install-project --no-dev

COPY app/ ./app/
COPY .env .
RUN mkdir -p data/documents vectorstore

# Set default values
ENV WORKERS=4
ENV PORT=8000

ENTRYPOINT []
CMD ["sh", "-c", "gunicorn app.main:app -w $WORKERS -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT"]

