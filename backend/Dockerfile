FROM python:3.12-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment
RUN uv venv /app/.venv

# Set environment variables to use the virtual environment
ENV PATH="/app/.venv/bin:$PATH"

COPY uv.lock .
COPY pyproject.toml .

RUN uv sync --frozen --no-install-project --no-dev

COPY . ./app
COPY .env .

RUN mkdir -p data/documents vectorstore

ENTRYPOINT []

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
